# The kernel and processes

Every program you run sits on top of an **operating system**. The operating system manages the machine's hardware resources, such as processors, memory, disks, and network cards, and hands programs cleaner abstractions to work with instead of raw hardware. A program does not drive a disk controller directly; it opens a file. It does not pick physical RAM chips; it uses its own virtual memory. It does not program a network card; it writes to a socket. Processes, virtual memory, files, sockets, and device access are all abstractions the operating system provides.

## The kernel

The **kernel** is the privileged core of the operating system. It is the part that actually manages CPU scheduling, memory, devices, and protection, and it is the part programs call into when they need something done on their behalf. Many other pieces people think of as "the OS", such as shells, window managers, and system utilities, are ordinary programs running on top of it.

## User mode and kernel mode

The kernel's privilege is enforced by the CPU itself, which runs in one of two execution modes:

- **User mode** is restricted. Applications run here. Code in user mode cannot directly execute privileged instructions, such as reconfiguring memory translation or talking to devices, and it cannot read or write protected kernel memory.
- **Kernel mode** is privileged. The operating system runs here so it can manage hardware and protected resources.

This split is what lets a buggy or malicious application crash only itself instead of taking down the whole machine or reading another program's data.

## System calls

If applications cannot touch hardware, how do they read a file or start another program? They ask the kernel. A **system call** is a controlled transition from user code into the kernel to request an operating-system service, such as reading a file, creating a process, or sending data on a socket. The program places its request in registers and executes a special instruction; the CPU switches to kernel mode and jumps to a fixed kernel entry point, so user code cannot choose arbitrary kernel code to run.

```c
ssize_t n = read(fd, buffer, sizeof buffer); // enters the kernel
```

System calls cost noticeably more than ordinary function calls. A normal call just jumps to other code in the same address space. A system call **crosses a protection boundary**: the CPU changes privilege level, the kernel must validate arguments it cannot trust, and the request may involve scheduling (for example, putting the caller to sleep while it waits) or real device work. That is why performance-sensitive code tries to make fewer, larger system calls rather than many tiny ones.

## Processes

A **process** is an executing program together with everything the operating system tracks for it: its own **virtual address space**, open files and other resources, and kernel bookkeeping such as its identity, permissions, and state. Two processes running the same program are still separate; each has its own memory and resources.

## Threads

A **thread** is a schedulable path of execution within a process. Every process has at least one thread, and many have several. Each thread has its own registers, instruction pointer, and stack, but threads in the same process usually share the process's address space and many of its resources, such as open files.

The **main difference between processes and threads** follows from that. Processes have **separate, protected address spaces** by default, so one cannot accidentally overwrite another's memory. Threads in one process **share memory**, which makes communication cheap but also means any shared mutable state needs synchronization. Two threads updating the same variable without coordination can corrupt it; two processes cannot even see each other's variables unless they deliberately set up sharing.

## Context switches

A single CPU core runs one instruction stream at a time. To run many threads, the operating system performs a **context switch**: it saves the execution state of the currently running thread or process, such as registers and instruction pointer, and restores the saved state of another, so the CPU can continue with different work. Switching between processes also changes the active address space.

Context switches are **not free**. The kernel spends time doing the switch itself, and that time does no useful work for the application. The larger cost is often hidden: the newly running work finds CPU caches, translation caches, and branch-prediction state filled with data from whatever ran before. Until those warm up again, it runs slower. Frequent switching therefore reduces useful execution time even when each individual switch looks cheap.
