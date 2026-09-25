# Synchronization

Threads in one process share memory, which makes cooperation cheap and mistakes easy. When two threads touch the same data without coordination, the result depends on exactly how their instructions happen to interleave. Synchronization primitives exist to take timing out of the correctness equation. This lesson covers the main tools, how lock-free code works, and the ways waiting can go wrong.

## Race conditions and critical sections

A **race condition** exists when a program's correctness depends on the timing or interleaving of concurrent accesses that are not properly synchronized. The classic example is two threads incrementing a shared counter. Each increment is really three steps: load the value, add one, store it back. If both threads load 5 before either stores, both store 6, and one increment is lost. The bug may appear once in a million runs, which makes races hard to reproduce.

A **critical section** is a piece of code that accesses shared state in a way that must not overlap with conflicting concurrent execution. The counter increment is one. The goal of synchronization is to make critical sections behave as if they ran one at a time.

## Mutexes and spinlocks

A **mutex** (mutual exclusion lock) allows only one execution path at a time into the critical section it protects. A thread locks it before entering and unlocks it on leaving; any other thread that tries to lock it meanwhile has to wait.

How it waits matters. A **spinlock** waits by checking the lock repeatedly in a tight loop instead of sleeping. That avoids the cost of putting the thread to sleep and waking it up again, but the waiting thread burns CPU the whole time. It is efficient only when waits are expected to be extremely short, such as protecting a few instructions inside a kernel.

A **blocking mutex** puts the waiting thread to sleep and lets the scheduler run something else. It is preferable **when a wait may last long enough that yielding the CPU costs less than spinning**. Many real mutex implementations combine both: spin briefly in case the lock frees up quickly, then sleep.

## Semaphores

A **semaphore** holds a count of permits. Acquiring takes a permit, or waits if none are left; releasing returns one. A semaphore initialized to 10 allows at most 10 threads into a region at once, which is useful for bounding concurrent access, such as limiting open database connections.

## Condition variables

Sometimes a thread must wait not for a lock but for shared state to reach some condition, such as "the queue is not empty". A **condition variable** lets threads sleep until the state may satisfy that condition. It is always used together with a lock and a loop that rechecks the condition, called the predicate:

```c
pthread_mutex_lock(&lock);
while (queue_is_empty(&queue)) {
    pthread_cond_wait(&not_empty, &lock); // releases lock while sleeping
}
item = queue_pop(&queue);
pthread_mutex_unlock(&lock);
```

The `while` loop is essential. A wakeup is only a hint. Wakeups can be **spurious**, meaning a thread wakes although nobody signaled, and even a real signal gives no guarantee: another thread may run first and change the condition before the waiter reacquires the lock. Correct code treats every notification as a reason to check again.

## Reader-writer locks

Many data structures are read far more often than written. A **reader-writer lock** allows either many concurrent readers or one exclusive writer. It helps when reads dominate, but a careless implementation can let a steady stream of readers starve writers forever, so good implementations take steps to avoid starvation.

## Atomics and compare-and-swap

Below locks sit **atomic operations**: operations that appear indivisible to other concurrent observers under the architecture's memory model. An atomic increment cannot be split into a lost-update race the way a plain increment can.

The most important atomic building block is **compare-and-swap (CAS)**. It compares a memory location with an expected value and, only if they match, replaces it with a new value, all as one atomic step, and reports whether it succeeded. A typical pattern reads the current value, computes a new one, and tries to CAS it in; if another thread changed the value in between, the CAS fails and the thread retries.

## Lock-free and wait-free progress

Algorithms built on atomics can offer progress guarantees that locks cannot:

- **Lock-free**: the system as a whole always makes progress. Some thread's operation always completes, even though an individual thread may keep failing and retrying, as in the CAS loop above.
- **Wait-free**: a stronger guarantee. Every operation completes within a bounded number of its own steps, regardless of what other threads do. No thread can starve.

Wait-free algorithms are harder to design and often slower on average, so lock-free designs are more common.

## Deadlock and lock ordering

**Deadlock** is a cycle of waiting where each participant needs a resource or event held by another participant in the cycle. If thread A holds lock 1 and waits for lock 2, while thread B holds lock 2 and waits for lock 1, neither can ever continue.

The most practical prevention is **lock ordering**: define a global order for acquiring locks, for example always lock 1 before lock 2, and make every thread follow it. A circular wait then cannot form.

## Priority inversion and inheritance

Schedulers with priorities add another trap. **Priority inversion** happens when a high-priority task needs a lock held by a low-priority task, while medium-priority work keeps the low-priority task from running. The high-priority task is effectively blocked by medium-priority work it has nothing to do with. This famously caused repeated resets on the Mars Pathfinder lander.

**Priority inheritance** fixes it: while a low-priority task holds a lock that a higher-priority task is waiting for, the OS temporarily raises the holder to the waiter's priority. It then runs, releases the resource sooner, and drops back to its normal priority.
