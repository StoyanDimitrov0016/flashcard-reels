import type { IdeaDeck } from "../idea-deck";

/** Sample content for the challenge lab. Real packages would use UUIDs for every ID except options. */
export const systemDesignDeck: IdeaDeck = {
  schema: 5,
  id: "deck-system-design",
  authorId: "author-lab",
  revision: 1,
  title: "System Design",
  description: "Resilience and scaling fundamentals",
  lessons: [
    {
      id: "lesson-resilience",
      title: "Resilience Patterns",
      sections: [
        { id: "section-timeouts", title: "Timeouts" },
        { id: "section-retries", title: "Retries" },
        { id: "section-circuit-breakers", title: "Circuit breakers" },
        { id: "section-bulkheads", title: "Bulkheads" },
      ],
    },
    {
      id: "lesson-scaling",
      title: "Scaling Reads and Writes",
      sections: [
        { id: "section-caching", title: "Caching" },
        { id: "section-idempotency", title: "Idempotency" },
        { id: "section-rate-limiting", title: "Rate limiting" },
        { id: "section-load-shedding", title: "Load shedding" },
      ],
    },
  ],
  ideas: [
    {
      id: "idea-timeout",
      title: "Timeouts",
      statement:
        "Every remote call needs a timeout, because a call that never returns holds a thread, a connection, and the caller's own deadline hostage.",
      sectionId: "section-timeouts",
      challenges: [
        {
          id: "timeout-tf",
          format: "true-false",
          level: "recognize",
          prompt: "A remote call without a timeout can wait forever.",
          answer: true,
          explanation: "Networks can drop a response silently, so only a timeout ends the wait.",
        },
        {
          id: "timeout-choice",
          format: "choice",
          level: "recognize",
          prompt: "What does a missing timeout put at risk first?",
          options: [
            { id: "a", text: "The threads and connections held by waiting calls", correct: true },
            {
              id: "b",
              text: "The accuracy of the response",
              correct: false,
              explanation: "A slow response can still be correct; the cost is what waits for it.",
            },
            { id: "c", text: "The size of the request body", correct: false },
          ],
        },
        {
          id: "timeout-fill",
          format: "fill-blanks",
          level: "recall",
          prompt: "A {{0}} turns an endless wait into a failure you can {{1}}.",
          answers: ["timeout", "handle"],
          distractors: ["retry", "cache"],
        },
        {
          id: "timeout-recall",
          format: "flashcard",
          level: "recall",
          prompt: "Why does every remote call need a timeout?",
          answer:
            "A call that never returns holds resources and blows the caller's deadline. A timeout turns an endless wait into a failure you can handle.",
        },
        {
          id: "timeout-apply",
          format: "choice",
          level: "apply",
          prompt:
            "A checkout request has a 2 s budget. It calls inventory, then payments. Which timeouts fit?",
          options: [
            {
              id: "a",
              text: "Pass the remaining budget down as a deadline for each call",
              correct: true,
            },
            {
              id: "b",
              text: "Give each call its own 2 s timeout",
              correct: false,
              explanation: "Two sequential 2 s calls can take 4 s, past the checkout budget.",
            },
            {
              id: "c",
              text: "No timeouts, so slow dependencies can finish",
              correct: false,
              explanation: "The user has given up long before a hung call finishes.",
            },
          ],
        },
      ],
    },
    {
      id: "idea-retry-backoff",
      title: "Retry with backoff and jitter",
      statement:
        "Retries should wait longer after each failure and add random jitter, so many clients don't retry in lockstep and flatten a recovering service.",
      sectionId: "section-retries",
      challenges: [
        {
          id: "retry-tf",
          format: "true-false",
          level: "recognize",
          prompt:
            "Retrying immediately and as often as possible helps a struggling service recover.",
          answer: false,
          explanation:
            "Immediate retries multiply the load on a service that is already overloaded.",
        },
        {
          id: "retry-jitter-choice",
          format: "choice",
          level: "recognize",
          prompt: "What problem does jitter solve?",
          options: [
            { id: "a", text: "Clients retrying at the same moment in waves", correct: true },
            { id: "b", text: "Retries that never stop", correct: false },
            { id: "c", text: "Responses that arrive out of order", correct: false },
            { id: "d", text: "Requests that are too large", correct: false },
          ],
        },
        {
          id: "retry-fill",
          format: "fill-blanks",
          level: "recall",
          prompt: "Retries should wait longer each time ({{0}}) and add randomness ({{1}}).",
          answers: ["backoff", "jitter"],
          distractors: ["timeouts", "bulkheads"],
          explanation: "Backoff spreads retries over time; jitter spreads them across clients.",
        },
        {
          id: "retry-recall",
          format: "flashcard",
          level: "recall",
          prompt: "Why combine exponential backoff with jitter?",
          answer:
            "Backoff spreads retries out over time, and jitter spreads them across clients, so retries don't arrive as synchronized spikes.",
        },
        {
          id: "retry-apply",
          format: "flashcard",
          level: "apply",
          prompt:
            "After a 30 s database blip, 10,000 clients all retry every 1 s exactly, and the database falls over again on recovery. What do you change?",
          answer:
            "Use exponential backoff with full jitter and cap the number of attempts, so retries spread out and the database can recover.",
        },
      ],
    },
    {
      id: "idea-circuit-breaker",
      title: "Circuit breaker",
      statement:
        "A circuit breaker stops calling a failing dependency for a while and fails fast instead, then lets a few trial calls through to see whether it recovered.",
      sectionId: "section-circuit-breakers",
      challenges: [
        {
          id: "breaker-tf",
          format: "true-false",
          level: "recognize",
          prompt: "An open circuit breaker sends every request to the failing dependency.",
          answer: false,
          explanation: "Open means calls fail fast without reaching the dependency.",
        },
        {
          id: "breaker-states",
          format: "choice",
          level: "recognize",
          prompt: "Which states does a circuit breaker move through?",
          options: [
            { id: "a", text: "Closed", correct: true },
            { id: "b", text: "Open", correct: true },
            { id: "c", text: "Half-open", correct: true },
            {
              id: "d",
              text: "Draining",
              correct: false,
              explanation: "Draining belongs to graceful shutdown, not to circuit breakers.",
            },
          ],
        },
        {
          id: "breaker-match",
          format: "match",
          level: "recognize",
          prompt: "Match each state to what it does",
          pairs: [
            { left: "Closed", right: "Calls go through" },
            { left: "Open", right: "Calls fail fast" },
            { left: "Half-open", right: "A few trial calls go through" },
          ],
        },
        {
          id: "breaker-recall",
          format: "flashcard",
          level: "recall",
          prompt: "What does the half-open state do?",
          answer:
            "It lets a few trial requests through. Success closes the breaker; failure opens it again.",
        },
        {
          id: "breaker-apply",
          format: "choice",
          level: "apply",
          prompt:
            "A recommendations service times out for minutes at a time. Product pages wait on it and pile up. What helps most?",
          options: [
            {
              id: "a",
              text: "Wrap the call in a circuit breaker and show pages without recommendations while it's open",
              correct: true,
            },
            {
              id: "b",
              text: "Retry the call three times before rendering",
              correct: false,
              explanation: "Retries triple the wait while the service is down.",
            },
            {
              id: "c",
              text: "Raise the timeout so calls have time to finish",
              correct: false,
              explanation: "Longer timeouts hold even more threads while pages pile up.",
            },
          ],
        },
      ],
    },
    {
      id: "idea-bulkhead",
      title: "Bulkhead",
      statement:
        "A bulkhead isolates resource pools, so overload in one workload cannot exhaust the resources unrelated workloads need.",
      sectionId: "section-bulkheads",
      challenges: [
        {
          id: "bulkhead-tf",
          format: "true-false",
          level: "recognize",
          prompt:
            "A bulkhead can stop one overloaded workload from consuming resources another workload needs.",
          answer: true,
        },
        {
          id: "bulkhead-purpose",
          format: "choice",
          level: "recognize",
          prompt: "What is the main purpose of the bulkhead pattern?",
          options: [
            { id: "a", text: "Isolate resource usage between workloads", correct: true },
            { id: "b", text: "Retry every failed request automatically", correct: false },
            { id: "c", text: "Route all traffic through one shared worker pool", correct: false },
            { id: "d", text: "Cache responses from slow dependencies", correct: false },
          ],
        },
        {
          id: "bulkhead-examples",
          format: "choice",
          level: "apply",
          prompt: "Which of these are bulkheads?",
          options: [
            {
              id: "a",
              text: "Payments use a separate worker pool from image processing",
              correct: true,
            },
            { id: "b", text: "Each dependency gets its own connection pool", correct: true },
            {
              id: "c",
              text: "Every workload shares one global thread pool",
              correct: false,
              explanation:
                "One shared pool is exactly what lets a single workload starve the rest.",
            },
            { id: "d", text: "A per-tenant concurrency limit", correct: true },
          ],
        },
        {
          id: "bulkhead-fill",
          format: "fill-blanks",
          level: "recognize",
          prompt: "A {{0}} gives each workload its own pool of resources.",
          answers: ["bulkhead"],
          distractors: ["circuit breaker", "retry", "cache"],
        },
        {
          id: "bulkhead-recall",
          format: "flashcard",
          level: "recall",
          prompt: "What problem does the bulkhead pattern solve?",
          answer:
            "It limits failure propagation: isolated resource pools mean one overloaded workload cannot exhaust the resources others need.",
        },
        {
          id: "bulkhead-apply",
          format: "flashcard",
          level: "apply",
          prompt:
            "Search and payments share one worker pool. A search spike takes every worker, and payments stop responding. What pattern reduces this risk?",
          answer:
            "A bulkhead: separate worker pools for search and payments, so a search spike can't take the workers payments need.",
        },
      ],
    },
    {
      id: "idea-cache-aside",
      title: "Cache-aside",
      statement:
        "With cache-aside, the application reads the cache first, loads from the database on a miss, and writes the result to the cache itself.",
      sectionId: "section-caching",
      challenges: [
        {
          id: "cache-tf",
          format: "true-false",
          level: "recognize",
          prompt: "In cache-aside, the database fills the cache automatically on a miss.",
          answer: false,
          explanation: "The application fills the cache. The database doesn't know it exists.",
        },
        {
          id: "cache-order",
          format: "choice",
          level: "recognize",
          prompt: "On a cache miss, what does the application do?",
          options: [
            {
              id: "a",
              text: "Read the database, then write the value to the cache",
              correct: true,
            },
            { id: "b", text: "Return an error and wait for the cache to warm", correct: false },
            { id: "c", text: "Write an empty value to the cache", correct: false },
          ],
        },
        {
          id: "cache-fill",
          format: "fill-blanks",
          level: "recall",
          prompt: "On a miss, the application reads the {{0}} and writes the value to the {{1}}.",
          answers: ["database", "cache"],
          distractors: ["queue", "replica"],
        },
        {
          id: "cache-recall",
          format: "flashcard",
          level: "recall",
          prompt: "Describe the read path of cache-aside.",
          answer:
            "Read the cache. On a hit, return it. On a miss, read the database, store the value in the cache with a TTL, then return it.",
        },
        {
          id: "cache-apply",
          format: "choice",
          level: "apply",
          prompt:
            "A popular product's cache entry expires and 5,000 requests hit the database at once. Which fixes address this?",
          options: [
            { id: "a", text: "Let one request rebuild the entry while others wait", correct: true },
            { id: "b", text: "Add random jitter to TTLs", correct: true },
            {
              id: "c",
              text: "Shorten the TTL",
              correct: false,
              explanation: "Shorter TTLs make the stampede happen more often.",
            },
            { id: "d", text: "Refresh hot entries before they expire", correct: true },
          ],
        },
      ],
    },
    {
      id: "idea-idempotency",
      title: "Idempotency keys",
      statement:
        "An idempotency key lets a server recognize a repeated request and return the first result, so retries can't charge or create something twice.",
      sectionId: "section-idempotency",
      challenges: [
        {
          id: "idem-tf",
          format: "true-false",
          level: "recognize",
          prompt: "An idempotency key makes it safe to retry a payment request.",
          answer: true,
        },
        {
          id: "idem-who",
          format: "choice",
          level: "recognize",
          prompt: "Who generates the idempotency key?",
          options: [
            { id: "a", text: "The client, once per logical operation", correct: true },
            {
              id: "b",
              text: "The server, once per received request",
              correct: false,
              explanation: "A retry is a new request, so a server-made key would differ each time.",
            },
            { id: "c", text: "The load balancer", correct: false },
          ],
        },
        {
          id: "idem-recall",
          format: "flashcard",
          level: "recall",
          prompt: "How does an idempotency key prevent a double charge?",
          answer:
            "The server stores the key with the first result. A retry with the same key gets that stored result instead of a second charge.",
        },
        {
          id: "idem-apply",
          format: "flashcard",
          level: "apply",
          prompt:
            "A mobile app's 'Place order' times out, the user taps again, and two orders appear. What do you change?",
          answer:
            "Generate an idempotency key when the order screen opens, send it with every attempt, and have the server return the existing order for a repeated key.",
        },
      ],
    },
    {
      id: "idea-token-bucket",
      title: "Token bucket",
      statement:
        "A token bucket refills at a steady rate and spends one token per request, so it allows short bursts up to its size while holding the average rate.",
      sectionId: "section-rate-limiting",
      challenges: [
        {
          id: "bucket-tf",
          format: "true-false",
          level: "recognize",
          prompt: "A token bucket never allows bursts above its refill rate.",
          answer: false,
          explanation: "Saved-up tokens allow a burst up to the bucket size.",
        },
        {
          id: "bucket-params",
          format: "choice",
          level: "recognize",
          prompt: "Which two settings define a token bucket?",
          options: [
            { id: "a", text: "Refill rate", correct: true },
            { id: "b", text: "Bucket size", correct: true },
            { id: "c", text: "Request timeout", correct: false },
            { id: "d", text: "Queue length", correct: false },
          ],
        },
        {
          id: "bucket-match",
          format: "match",
          level: "recognize",
          prompt: "Match each part to what it controls",
          pairs: [
            { left: "Refill rate", right: "The long-run average" },
            { left: "Bucket size", right: "The largest burst" },
            { left: "A request", right: "Spends one token" },
          ],
        },
        {
          id: "bucket-recall",
          format: "flashcard",
          level: "recall",
          prompt: "How does a token bucket allow bursts but limit the average rate?",
          answer:
            "Unused tokens accumulate up to the bucket size, which allows a burst; the refill rate caps the long-run average.",
        },
        {
          id: "bucket-apply",
          format: "choice",
          level: "apply",
          prompt:
            "An API allows 10 requests per second with a bucket size of 50. A client has been idle for a minute. How many requests can it send right now?",
          options: [
            { id: "a", text: "50", correct: true },
            {
              id: "b",
              text: "10",
              correct: false,
              explanation: "10 per second is the refill rate. An idle client has a full bucket.",
            },
            {
              id: "c",
              text: "600",
              correct: false,
              explanation: "Tokens stop accumulating once the bucket is full.",
            },
          ],
        },
      ],
    },
    {
      id: "idea-load-shedding",
      title: "Load shedding",
      statement:
        "Load shedding rejects some requests early when a service is past capacity, so the requests it accepts still finish in time.",
      sectionId: "section-load-shedding",
      challenges: [
        {
          id: "shed-tf",
          format: "true-false",
          level: "recognize",
          prompt: "Rejecting requests on purpose can raise the number of requests that succeed.",
          answer: true,
          explanation:
            "Past capacity, everything slows until nearly every request times out. Shedding protects the rest.",
        },
        {
          id: "shed-recall",
          format: "flashcard",
          level: "recall",
          prompt: "Why is it better to reject a request early than to queue it?",
          answer:
            "A queued request that will miss its deadline still costs work. Rejecting it early is cheap and keeps latency low for the requests that are accepted.",
        },
        {
          id: "shed-apply",
          format: "choice",
          level: "apply",
          prompt:
            "During a flash sale, checkout and product browsing share a service that is at 150% capacity. What should it shed first?",
          options: [
            { id: "a", text: "Low-priority browsing requests", correct: true },
            {
              id: "b",
              text: "Checkout requests",
              correct: false,
              explanation: "Checkout is the revenue path; shed the work that matters least.",
            },
            {
              id: "c",
              text: "Nothing; queue everything until the sale ends",
              correct: false,
              explanation: "An unbounded queue makes every request late.",
            },
          ],
        },
      ],
    },
  ],
};
