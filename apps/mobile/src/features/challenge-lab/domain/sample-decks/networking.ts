import type { IdeaDeck } from "../idea-deck";

export const networkingDeck: IdeaDeck = {
  schema: 5,
  id: "deck-networking",
  authorId: "author-lab",
  revision: 1,
  title: "Networking",
  description: "What happens between the client and the server",
  lessons: [
    {
      id: "lesson-net-core",
      title: "Protocols",
      sections: [
        { id: "section-tcp", title: "TCP" },
        { id: "section-dns", title: "DNS" },
        { id: "section-http-caching", title: "HTTP caching" },
        { id: "section-tls", title: "TLS" },
      ],
    },
  ],
  ideas: [
    {
      id: "idea-tcp-handshake",
      title: "TCP handshake",
      statement:
        "TCP opens a connection with a three-way handshake, SYN, SYN-ACK, ACK, so each side confirms the other can send and receive.",
      sectionId: "section-tcp",
      challenges: [
        {
          id: "tcp-tf",
          format: "true-false",
          level: "recognize",
          prompt: "UDP performs a handshake before sending data.",
          answer: false,
          explanation: "UDP is connectionless: it sends datagrams without setting anything up.",
        },
        {
          id: "tcp-order",
          format: "choice",
          level: "recognize",
          prompt: "What is the order of the TCP handshake?",
          options: [
            { id: "a", text: "SYN, SYN-ACK, ACK", correct: true },
            { id: "b", text: "SYN, ACK, FIN", correct: false },
            { id: "c", text: "ACK, SYN, SYN-ACK", correct: false },
          ],
        },
        {
          id: "tcp-provides",
          format: "choice",
          level: "recall",
          prompt: "What does TCP provide?",
          options: [
            { id: "a", text: "In-order delivery", correct: true },
            { id: "b", text: "Retransmission of lost segments", correct: true },
            {
              id: "c",
              text: "Message boundaries",
              correct: false,
              explanation: "TCP is a byte stream; framing messages is up to the application.",
            },
            { id: "d", text: "Flow control", correct: true },
          ],
        },
        {
          id: "tcp-fill",
          format: "fill-blanks",
          level: "recognize",
          prompt: "TCP opens a connection with {{0}}, then {{1}}, then ACK.",
          answers: ["SYN", "SYN-ACK"],
          distractors: ["FIN", "RST"],
        },
        {
          id: "tcp-recall",
          format: "flashcard",
          level: "recall",
          prompt: "Why does TCP need three messages to open a connection?",
          answer:
            "Each side must send its starting sequence number and see it acknowledged: SYN, SYN-ACK, then ACK.",
        },
      ],
    },
    {
      id: "idea-dns-ttl",
      title: "DNS TTL",
      statement:
        "DNS answers are cached for their TTL, so a record change reaches clients only as their cached copies expire.",
      sectionId: "section-dns",
      challenges: [
        {
          id: "dns-tf",
          format: "true-false",
          level: "recognize",
          prompt: "Changing a DNS record updates every client immediately.",
          answer: false,
          explanation: "Resolvers keep serving the cached answer until its TTL runs out.",
        },
        {
          id: "dns-ttl-meaning",
          format: "choice",
          level: "recognize",
          prompt: "What does a DNS record's TTL control?",
          options: [
            { id: "a", text: "How long resolvers may cache the answer", correct: true },
            {
              id: "b",
              text: "How many hops a packet may take",
              correct: false,
              explanation: "That's the IP packet TTL: the same name for a different field.",
            },
            { id: "c", text: "How long a connection may stay idle", correct: false },
          ],
        },
        {
          id: "dns-fill",
          format: "fill-blanks",
          level: "recall",
          prompt: "Lower a record's {{0}} before a move, so cached answers {{1}} sooner.",
          answers: ["TTL", "expire"],
          distractors: ["priority", "grow"],
        },
        {
          id: "dns-migration",
          format: "choice",
          level: "apply",
          prompt: "You're moving a site to a new IP tomorrow. What should you do today?",
          options: [
            { id: "a", text: "Lower the record's TTL", correct: true },
            {
              id: "b",
              text: "Raise the record's TTL",
              correct: false,
              explanation: "Clients would hold on to the old IP even longer after the move.",
            },
            { id: "c", text: "Restart the DNS server", correct: false },
          ],
        },
      ],
    },
    {
      id: "idea-http-caching",
      title: "HTTP caching",
      statement:
        "`Cache-Control: max-age` lets a client reuse a response without asking; an `ETag` lets it revalidate cheaply and get `304 Not Modified` when nothing changed.",
      sectionId: "section-http-caching",
      challenges: [
        {
          id: "http-tf",
          format: "true-false",
          level: "recognize",
          prompt: "A `304 Not Modified` response sends the full body again.",
          answer: false,
          explanation: "A 304 has no body; the client reuses the copy it already has.",
        },
        {
          id: "http-revalidate",
          format: "choice",
          level: "recall",
          prompt: "Which headers take part in revalidating a cached response?",
          options: [
            { id: "a", text: "`ETag`", correct: true },
            { id: "b", text: "`If-None-Match`", correct: true },
            { id: "c", text: "`If-Modified-Since`", correct: true },
            {
              id: "d",
              text: "`Content-Length`",
              correct: false,
              explanation: "It describes the body's size, not whether it changed.",
            },
          ],
        },
        {
          id: "http-match",
          format: "match",
          level: "recognize",
          prompt: "Match each header to its job",
          pairs: [
            { left: "`Cache-Control: max-age`", right: "Reuse without asking" },
            { left: "`ETag`", right: "Name this version" },
            { left: "`If-None-Match`", right: "Ask whether it changed" },
          ],
        },
        {
          id: "http-hashed-bundle",
          format: "choice",
          level: "apply",
          prompt: "`app.3f9c.js` never changes once deployed. Which header fits it?",
          options: [
            { id: "a", text: "`Cache-Control: max-age=31536000, immutable`", correct: true },
            {
              id: "b",
              text: "`Cache-Control: no-cache`",
              correct: false,
              explanation: "That revalidates on every use, and a hashed file never needs to.",
            },
            {
              id: "c",
              text: "`Cache-Control: no-store`",
              correct: false,
              explanation: "That forces a full download every time.",
            },
          ],
        },
      ],
    },
    {
      id: "idea-tls",
      title: "TLS",
      statement:
        "TLS gives a connection confidentiality, integrity, and server authentication: the certificate proves who the server is, and the handshake agrees on keys.",
      sectionId: "section-tls",
      challenges: [
        {
          id: "tls-tf",
          format: "true-false",
          level: "recognize",
          prompt: "TLS also encrypts the DNS lookup for the site's hostname.",
          answer: false,
          explanation: "DNS is a separate lookup. It needs DNS over HTTPS or TLS to be private.",
        },
        {
          id: "tls-certificate",
          format: "choice",
          level: "recognize",
          prompt: "What does the server's certificate prove?",
          options: [
            { id: "a", text: "That the server controls the domain", correct: true },
            {
              id: "b",
              text: "That the site is safe to use",
              correct: false,
              explanation: "A valid certificate says nothing about the site's intentions.",
            },
            { id: "c", text: "That the connection is fast", correct: false },
          ],
        },
        {
          id: "tls-protects",
          format: "choice",
          level: "apply",
          prompt: "What does TLS protect against?",
          options: [
            { id: "a", text: "Eavesdropping on the traffic", correct: true },
            { id: "b", text: "Tampering in transit", correct: true },
            { id: "c", text: "Someone impersonating the server", correct: true },
            {
              id: "d",
              text: "A compromised server",
              correct: false,
              explanation: "TLS protects the channel, not what happens at either end.",
            },
          ],
        },
        {
          id: "tls-recall",
          format: "flashcard",
          level: "recall",
          prompt: "What three things does TLS give a connection?",
          answer:
            "Confidentiality through encryption, integrity against tampering, and authentication of the server through its certificate.",
        },
      ],
    },
  ],
};
