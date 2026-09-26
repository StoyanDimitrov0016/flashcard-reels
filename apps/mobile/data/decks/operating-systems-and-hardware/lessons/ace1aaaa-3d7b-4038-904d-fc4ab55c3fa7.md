# Buffered I/O

Storage devices are slow and prefer large transfers; programs are fast and often read or write a few bytes at a time. Between the two sit layers of memory buffers that make I/O dramatically faster. Those same buffers explain one of the most dangerous misunderstandings in systems programming: a `write` that returned successfully may not have put anything on disk. This lesson follows data from a program's buffer to durable storage, shows how to make it actually arrive, and covers how servers avoid copying it more than necessary.

## Buffered I/O

With **buffered I/O**, data is held temporarily in memory buffers so programs or the OS can combine small operations into larger transfers and decouple producers from devices. Buffering happens at two levels.

In the program, libraries such as C's `stdio` keep a buffer, several kilobytes by default. `fprintf` copies bytes into it and issues a `write` system call only when the buffer fills, when the program calls `fflush`, or when the file is closed. On Linux you can watch the batching:

```c
for (int i = 0; i < 1000; i++)
    fprintf(f, "line %d\n", i);     /* 8,890 bytes of output in total */
```

```sh
$ strace -e trace=write ./app
write(3, "line 0\nline 1\nline 2\n"..., 4096)   = 4096
write(3, "e 467\nline 468\nline 469\n"..., 4096) = 4096
write(3, " 922\nline 923\nline 924\n"..., 698)   = 698
```

A thousand calls became three system calls. (Output to a terminal is line-buffered instead, so you see each line promptly.)

In the kernel, the same principle applies on a larger scale, through the page cache.

## The page cache

The **page cache** is where the OS keeps recently accessed file data in RAM, so later reads can be served without storage I/O and writes can often be buffered before they are persisted.

- **Reads**: the first `read` of a file block fetches it from the device into the page cache and copies it to the program. Later reads of that block, by any process, are served from RAM. That is why running `grep` over a source tree is slow the first time and fast the second.
- **Writes**: `write` copies data into page-cache pages, marks them **dirty**, and returns immediately. Kernel flusher threads write dirty pages back to the device later, on Linux typically within about 30 seconds or sooner under memory pressure.

The page cache uses memory that would otherwise sit idle, and the kernel shrinks it whenever programs need RAM. That is why `free -h` on a busy Linux server shows most memory as `buff/cache`: it is not wasted, and it is reclaimable.

## Zero-copy I/O

Buffers also cost copies. A static file server doing the obvious thing:

```c
while ((n = read(file_fd, buf, sizeof buf)) > 0)
    write(sock_fd, buf, n);
```

moves each byte from the device into the page cache by DMA, then copies it from the page cache into `buf` with the CPU, then copies it again from `buf` into the kernel's socket buffers, and finally DMA sends it to the network card. The two CPU copies through user space accomplish nothing, and each chunk costs two system calls.

**Zero-copy I/O** reduces redundant copying of data between kernel and user buffers, often by mapping, splicing, or letting devices transfer directly from kernel-managed pages. On Linux:

```c
off_t offset = 0;
sendfile(sock_fd, file_fd, &offset, file_size);   /* page cache -> socket, no user copy */
```

`sendfile` tells the kernel to send file data straight from the page cache to the socket; with a capable network card, the card reads the page-cache pages directly by DMA. Related tools include `splice`, which moves data between a pipe and another descriptor inside the kernel, and `mmap`, which lets a program read file pages in place. Web servers, proxies, and message brokers such as Kafka rely on these to serve data at network speed with little CPU.

## Why a successful write is not durable

Here is the trap. **A successful file write does not always mean the data is on durable storage**, because the kernel or the device may have acknowledged data that is still held in volatile buffers. When `write` returns, the data may be in:

```text
stdio buffer in the process        lost if the process crashes
kernel page cache (dirty page)     lost if the machine loses power or the kernel crashes
drive's internal volatile cache    lost if the drive loses power
flash or magnetic media            durable
```

For most files that is fine: if a crash loses the last few seconds of a log file, nobody minds. But a database that tells a client "your payment is committed" must not lose that record in a power failure. Explicit synchronization is needed whenever an application requires persistence before it continues.

## fsync

**`fsync`** asks the operating system to flush the relevant buffered file data and metadata toward durable storage, according to the platform's guarantees. On Linux, `fsync(fd)` writes the file's dirty pages and its inode metadata to the device, asks the device to flush its volatile cache, and returns only when that is done. `fdatasync` is a cheaper variant that skips metadata not needed to read the data back, such as the modification time.

```c
write(log_fd, record, len);
if (fsync(log_fd) != 0) {       /* do not acknowledge the commit until this succeeds */
    abort();                    /* the data's state is unknown; do not retry blindly */
}
send_reply(client, "committed");
```

Some details matter in practice:

- `fflush` is not `fsync`. `fflush` only moves data from the `stdio` buffer into the kernel.
- A newly created or renamed file's name lives in its directory, so durable creation also requires an `fsync` on the directory. The standard pattern for safely replacing a file is: write a temporary file, `fsync` it, `rename` it over the original, then `fsync` the directory.
- `fsync` is slow, from tens of microseconds on an NVMe drive with power-loss protection to many milliseconds on a hard disk, which is why databases batch many transactions into one flush.
- Treat an `fsync` error as serious. After a failed writeback, Linux may mark the dirty pages clean, so simply retrying can report success while data is lost. PostgreSQL learned this in 2018 and now stops rather than retrying.

"According to the platform's guarantees" is not a hedge: some drives and virtualized storage have historically acknowledged flushes they had not performed, and macOS requires the `F_FULLFSYNC` flag for a true device flush.

## Common mistakes

- Treating the return of `write` as proof that data survived a power failure.
- Calling `fflush` and assuming the data is durable.
- Syncing a new file's contents but not its directory entry.
- Forcing an `fsync` after every small write where durability is not needed, turning a fast program into a slow one.

## Key points

- Buffered I/O holds data in memory so small operations can be combined into larger transfers and producers are decoupled from devices.
- The page cache keeps recently accessed file data in RAM so reads can skip storage and writes can be buffered before persistence.
- Zero-copy I/O reduces redundant copies between kernel and user buffers through mapping, splicing, or sending directly from kernel pages.
- A successful write may only mean data reached volatile buffers in the kernel or device; applications that need persistence must synchronize explicitly.
- `fsync` asks the OS to flush a file's buffered data and metadata toward durable storage according to the platform's guarantees.
