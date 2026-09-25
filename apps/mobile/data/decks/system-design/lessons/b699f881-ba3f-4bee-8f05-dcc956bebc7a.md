# Load balancing and service discovery

A service that scales horizontally, per the earlier lesson, runs on many instances. Something must decide which instance handles each incoming request, keep sending traffic only to instances that are actually healthy, and know which instances currently exist in the first place, since instances come and go as the system scales up, scales down, deploys, or fails. This lesson covers all three.

## Load balancers

A **load balancer** distributes requests across multiple backend instances and can remove unhealthy instances from rotation. It sits in front of a pool of otherwise-identical instances and picks one for each request (or connection), so clients and upstream callers only need to know about the load balancer, not about every instance behind it.

## Health checking

A load balancer can only avoid a broken instance if it knows the instance is broken. **Health checking** solves that problem: routing systems periodically probe each instance (an HTTP request to a `/health` endpoint, or a lower-level connection check) and stop sending traffic to instances that fail those probes, reducing requests sent to failed or unready nodes. Without health checks, a load balancer keeps sending a share of traffic to a crashed or overloaded instance until an operator intervenes, which turns one instance's failure into errors for every user unlucky enough to be routed there.

## Choosing an instance: routing algorithms

Given several healthy instances, how does the load balancer pick one?

**Round robin** sends successive requests to backends in rotation — instance 1, then 2, then 3, then back to 1. It is simple and requires no state about instance load, but it ignores differences in request cost and backend load: if one request is cheap and the next is expensive, round robin does not know or care, and an instance that is already busy gets the same share of new work as an idle one.

**Least-connections** routing favors backends with fewer active connections. It is useful when requests are long-lived or unevenly timed, because it can better distribute that kind of load than simple round robin — an instance stuck serving several slow requests receives fewer new ones until it catches up.

## When you need the same backend: sticky sessions

**Sticky-session routing** sends a client repeatedly to the same backend, often using a cookie or a consistent hash of some client identifier. It can simplify local session state — an application that keeps a user's session data in that instance's memory needs the user to keep landing on the same instance — but it weakens balancing (that instance's load is no longer freely redistributable) and weakens failover (if that instance dies, its in-memory session state goes with it).

## Why statelessness is the better fix

Sticky sessions are a workaround for a design problem: application logic that keeps request-specific state in one instance's memory. The stronger fix is **stateless application logic**: designing services so that any instance can handle any request, because required durable state lives elsewhere (a database, a shared cache), not in the handling instance's memory.

This is why stateless services are easier to scale horizontally: instances can be added, removed, or replaced freely, without needing to move any user-specific in-memory state first, and load balancing algorithms like round robin or least-connections work exactly as intended, with no sticky exception carved out.

## Finding the instances: service discovery and registries

Load balancing assumes you already know the pool of backend instances — but that pool changes constantly as instances are deployed, scaled, or replaced. **Service discovery** maps a logical service name (`orders-service`) to the instances currently reachable under it, so that clients or proxies can route to live instances without a fixed, manually maintained host list that would go stale the moment anything changed.

The data behind service discovery lives in a **service registry**: a store of service instance locations and health metadata that discovery mechanisms read from. Instances typically register themselves (or are registered by an orchestrator) on startup and are removed on shutdown or when they stop reporting healthy, so the registry — and therefore what any load balancer routes to — reflects the live set of instances, not the set that existed when the system was last deployed.

## Common mistakes

- Assuming round robin is "fair." It is fair in the sense of equal request count, not equal load — a mix of cheap and expensive requests, or instances at different levels of existing load, defeats that fairness quickly.
- Reaching for sticky sessions to fix a session-state problem, instead of moving that state out of the instance and keeping the service stateless — the workaround treats a symptom and reintroduces the failover weakness statelessness was meant to avoid.
- Treating the backend pool as fixed. In any autoscaled or frequently deployed system, the set of healthy instances changes continuously; routing that does not consult live health and discovery data will send traffic to instances that no longer exist or never became ready.

## Key points

- A load balancer distributes requests across backend instances and removes unhealthy ones from rotation.
- Health checks let routing systems detect and avoid instances that cannot safely serve traffic.
- Round robin rotates requests evenly but ignores request cost and current load; least-connections favors backends with fewer active connections, which suits long-lived or uneven requests better.
- Sticky-session routing pins a client to one backend, simplifying local session state at the cost of weaker balancing and failover.
- Stateless application logic lets any instance handle any request, since durable state lives elsewhere, which is what makes horizontal scaling and load balancing work cleanly.
- Service discovery maps a service name to its currently reachable instances, backed by a service registry of instance locations and health.
