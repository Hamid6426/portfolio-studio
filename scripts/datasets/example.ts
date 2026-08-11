/**
 * The example dataset — and the documentation for writing your own.
 *
 * "Sara Meridian" is a **fictional** persona invented for this file. She is not
 * a real person; every project, client, role and link below is made up, and
 * every address is on `example.com` (reserved by RFC 2606, so it can never
 * belong to anyone). Seed it to get a full site you can click through, then
 * replace it with yourself.
 *
 * ## Run it
 *
 *     bun run db:migrate          # once, on a fresh database
 *     bun run db:seed             # this dataset (the default)
 *     bun run db:seed -- --force  # rewrite + republish the seeded pages
 *
 * ## Make it yours
 *
 * 1. Copy this file:
 *
 *        cp scripts/datasets/example.ts scripts/datasets/me.private.ts
 *
 *    Anything matching `scripts/datasets/*.private.ts` is gitignored, so your
 *    real name, email and client list stay out of version control.
 *
 * 2. Edit the content. Change `admin` first — the email is your login and the
 *    password is the one you will type, so make it yours before seeding.
 *
 * 3. Seed it:
 *
 *        bun run db:seed -- --dataset=me.private
 *
 * ## How the content model works
 *
 * A dataset is pure content. Each page lists `sections`, and each section is a
 * plain data record with a `kind` — `hero`, `pageHeader`, `prose`, `statRow`,
 * `itemList`, `cardGrid`, `linkRow`, `timeline`, `citationList`. See
 * `scripts/datasets/types.ts` for every field. `scripts/sections.ts` decides
 * how each one looks, so you never write blocks or CSS here; if you want a
 * different look, change `sections.ts` once and every page follows.
 *
 * The page editor only has seven block types (section, container, heading,
 * text, image, button, divider) and only the CSS properties allowlisted in
 * `src/lib/block-sanitize.ts` survive rendering — which is why the section list
 * is short and deliberate rather than open-ended. Rows (`columns`, `perRow`)
 * do not wrap, so keep them to three or four short items.
 *
 * Everything the seed writes is ordinary page content: open
 * `/dashboard/pages` afterwards and edit any of it by hand.
 */
import type { PortfolioDataset } from "./types";

export const dataset: PortfolioDataset = {
  admin: {
    name: "Sara Meridian",
    /** RFC 2606 reserved domain — change this to your own address. */
    email: "sara@example.com",
    /** Example credential. Change it here, or from the dashboard after login. */
    password: "Example.123",
  },

  nav: [
    { label: "Home", href: "/" },
    { label: "Work", href: "/work" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],

  pages: [
    /* ── / ─────────────────────────────────────────────────────────────── */
    {
      title: "Sara Meridian",
      slug: null,
      description:
        "Product designer and frontend developer. I help small teams ship interfaces that feel considered.",
      sections: [
        {
          kind: "hero",
          eyebrow: "Independent practice · Remote, CET",
          title: "Sara Meridian",
          credentials: ["Product Design", "Design Systems", "React"],
          subtitle: "Product Designer & Frontend Developer",
          tagline:
            "I help small teams turn a rough idea into an interface people can actually use — and then I build it.",
          actions: [
            { label: "See selected work", href: "/work", variant: "primary" },
            { label: "Start a project", href: "/contact" },
          ],
        },
        {
          kind: "statRow",
          background: "alt",
          perRow: 4,
          stats: [
            { label: "Years in practice", value: "9" },
            { label: "Products shipped", value: "24" },
            { label: "Design systems built", value: "6" },
            { label: "Repeat clients", value: "11" },
          ],
        },
        {
          kind: "prose",
          heading: "About",
          paragraphs: [
            "I design and build product interfaces for teams that are small enough to move quickly and serious enough to care how the result feels. Most of my work sits in the awkward middle of a product's life: the prototype worked, the first users arrived, and nothing quite scales.",
            "I work end to end. That usually means a week of talking to the people who use the thing, a few weeks of design in the open, and then the same hands writing the React that ships. Handing a Figma file over a wall wastes the part where the interesting problems show up.",
            "Before going independent I led design at a small logistics company and spent four years on a design systems team, which is where I learned that the hard part of a component library is never the components.",
          ],
        },
        {
          kind: "cardGrid",
          heading: "What I do",
          background: "alt",
          columns: 3,
          items: [
            {
              title: "Product design",
              body: "Flows, screens and the arguments behind them. Research when it changes the decision, prototypes when it settles one faster.",
            },
            {
              title: "Design systems",
              body: "Tokens, components and the documentation that stops the system drifting a month after launch.",
            },
            {
              title: "Frontend",
              body: "React and TypeScript, accessible by default. I build what I design, so the shipped thing matches the mock.",
            },
          ],
        },
        {
          kind: "cardGrid",
          heading: "Recent work",
          items: [
            {
              title: "Harborlight — booking flow rebuild",
              subtitle: "Product design & frontend · 2025",
              body: "Cut a seven-step boat rental checkout to three and rebuilt it as a single React flow. Abandoned bookings dropped by a third in the first month.",
              meta: "10 weeks · Design, React, TypeScript",
            },
            {
              title: "Fernwood — field notes for ecologists",
              subtitle: "Lead designer · 2024",
              body: "An offline-first note-taking app for surveyors working in places with no signal. Two rounds of fieldwork shaped the whole information architecture.",
              meta: "14 weeks · Research, design, prototype",
            },
            {
              title: "Slate — design system for Northwind Labs",
              subtitle: "Design systems lead · 2024",
              body: "Forty components, one token pipeline, and a contribution process the product teams actually used.",
              meta: "6 months · Systems, docs, governance",
            },
          ],
        },
        {
          kind: "linkRow",
          background: "alt",
          groups: [
            {
              heading: "Connect",
              /** Placeholder profiles — swap these for your real ones. */
              links: [
                { label: "sara@example.com", href: "mailto:sara@example.com" },
                { label: "GitHub", href: "https://example.com/sara-meridian" },
                {
                  label: "LinkedIn",
                  href: "https://example.com/in/sara-meridian",
                },
                { label: "Writing", href: "https://example.com/sara/notes" },
              ],
            },
            {
              heading: "Explore",
              links: [
                { label: "Selected work", href: "/work" },
                { label: "About & career", href: "/about" },
                { label: "Contact", href: "/contact" },
              ],
            },
          ],
        },
      ],
    },

    /* ── /work ─────────────────────────────────────────────────────────── */
    {
      title: "Work",
      slug: "work",
      description:
        "Case studies in product design, design systems and frontend engineering.",
      sections: [
        {
          kind: "pageHeader",
          title: "Selected Work",
          blurb:
            "Five projects, newest first. Every one of them shipped and has real users.",
        },
        {
          kind: "cardGrid",
          heading: "Case studies",
          items: [
            {
              title: "Harborlight",
              subtitle: "Booking flow rebuild · Product design & frontend · 2025",
              body: [
                "Harborlight rents boats in twelve harbours and had grown a checkout of seven screens, three of which existed only because of a payment provider that had since been replaced.",
                "I watched eleven bookings happen in person, rebuilt the flow as three screens, and shipped it in React behind a flag. Abandoned bookings fell by roughly a third in the first month and support tickets about double charges stopped entirely.",
              ],
              meta: "10 weeks · Design, React, TypeScript, Stripe",
            },
            {
              title: "Fernwood",
              subtitle: "Field notes for ecologists · Lead designer · 2024",
              body: [
                "Surveyors record species counts in places with no signal, then lose an evening typing them up. Fernwood is an offline-first app that closes that gap.",
                "Two rounds of fieldwork — one wet — reshaped the information architecture around the survey rather than the species, which is how the people doing the work already think about it.",
              ],
              meta: "14 weeks · Research, design, prototype, handover",
            },
            {
              title: "Slate",
              subtitle: "Design system for Northwind Labs · Systems lead · 2024",
              body: [
                "Four product teams, four button components, and a redesign that had stalled twice. Slate is forty components, a token pipeline feeding both Figma and CSS, and a contribution process with a named owner.",
                "The measurable win was not the components: it was cutting the time to spin up a new internal tool from three weeks to four days.",
              ],
              meta: "6 months · Tokens, components, docs, governance",
            },
            {
              title: "Latchkey",
              subtitle: "Self-hosted password vault · Design & frontend · 2023",
              body: [
                "A security product for people who are not security people. The whole design problem was making a recovery flow that a worried person can complete correctly at 11pm.",
                "Shipped with a plain-language threat model on the marketing page, which turned out to be the most-read page on the site.",
              ],
              meta: "8 weeks · Design, React, accessibility audit",
            },
            {
              title: "Orchard Health",
              subtitle: "Patient intake redesign · Product designer · 2023",
              body: [
                "A twenty-minute paper intake form, rebuilt as a phone-first flow that a patient completes in the waiting room and a clinician reads in fifteen seconds.",
                "Designed against WCAG 2.2 AA from the first sketch, tested with six patients over 70, and shortened by four questions nobody could explain the purpose of.",
              ],
              meta: "12 weeks · Research, design, WCAG 2.2 AA",
            },
          ],
        },
        {
          kind: "itemList",
          heading: "Toolkit",
          background: "alt",
          groups: [
            {
              heading: "Design",
              items: [
                "Figma, including variables and a maintained token pipeline",
                "Interface and interaction design for web and mobile web",
                "Design systems: tokens, components, documentation, governance",
                "Usability testing and lightweight field research",
                "Accessibility review against WCAG 2.2 AA",
              ],
            },
            {
              heading: "Engineering",
              items: [
                "TypeScript and React, including Next.js App Router",
                "CSS architecture, Tailwind, and design-token plumbing",
                "Component libraries with Storybook and visual regression tests",
                "Prototypes real enough to test with actual users",
                "Performance work: bundle budgets, Core Web Vitals",
              ],
            },
          ],
        },
        {
          kind: "prose",
          heading: "How a project runs",
          paragraphs: [
            "Most engagements are eight to fourteen weeks. The first week is discovery: I talk to the people who use the product and the people who support it, and I write down what I heard before designing anything.",
            "After that it is weekly. You see work every Thursday, in the browser wherever possible. Nothing is saved up for a reveal, and anything I build is yours in your repository from day one.",
          ],
          actions: [
            { label: "Check availability", href: "/contact", variant: "primary" },
            { label: "Read about me", href: "/about" },
          ],
        },
      ],
    },

    /* ── /about ────────────────────────────────────────────────────────── */
    {
      title: "About",
      slug: "about",
      description:
        "Career history, principles, writing and talks by Sara Meridian.",
      sections: [
        {
          kind: "pageHeader",
          title: "About",
          blurb:
            "Nine years of designing and building software, most of it for teams under thirty people.",
        },
        {
          kind: "prose",
          heading: "Hello",
          paragraphs: [
            "I started out as a frontend developer who kept quietly redrawing the designs I was handed, which is a slow way to discover you want to be a designer. I have done both jobs ever since and I no longer think of them as two jobs.",
            "What I care about is durability. Anyone can make a screen that demos well; the interesting constraint is whether it still makes sense after the team has changed twice and the product has grown three features nobody planned for.",
            "I work from a small studio with bad coffee and good light, mostly with teams in Europe. I read a lot of maintenance manuals, which explains more about my design taste than anything I could write here.",
          ],
        },
        {
          kind: "timeline",
          heading: "Career",
          background: "alt",
          entries: [
            {
              period: "2022 – Present",
              title: "Independent designer & developer",
              organization: "Own practice · Remote",
              detail:
                "Product design and frontend for early-stage teams, usually as the only designer in the room.",
            },
            {
              period: "2020 – 2022",
              title: "Head of Design",
              organization: "Harborlight",
              detail:
                "Grew design from one person to three, and shipped the booking platform the company still runs on.",
            },
            {
              period: "2018 – 2020",
              title: "Senior Product Designer",
              organization: "Northwind Labs",
              detail:
                "Design systems team. Built the first version of what later became Slate.",
            },
            {
              period: "2016 – 2018",
              title: "Product Designer",
              organization: "Fernwood Software",
              detail:
                "Field research tools for conservation groups. My first job doing research properly.",
            },
            {
              period: "2014 – 2016",
              title: "Frontend Developer",
              organization: "Latchkey",
              detail: "Where the redrawing-the-designs habit started.",
            },
          ],
        },
        {
          kind: "itemList",
          heading: "Principles",
          groups: [
            {
              items: [
                "Ship the smallest thing that answers the question.",
                "Design in the browser once the idea survives paper.",
                "Accessibility is a constraint on the first sketch, not an audit at the end.",
                "Every component you add is a component someone has to maintain.",
                "If the copy is confusing, the interface is confusing.",
                "Leave the codebase easier to change than you found it.",
              ],
            },
          ],
        },
        {
          kind: "citationList",
          heading: "Writing & talks",
          background: "alt",
          items: [
            {
              title: "The maintenance cost of a component library",
              authors: ["Sara Meridian"],
              source: "Frontline Design Journal",
              year: 2025,
              index: "Article",
            },
            {
              title: "Designing for people with no signal",
              authors: ["Sara Meridian", "Ines Kowalczyk"],
              source: "Interaction Europe, Rotterdam",
              year: 2024,
              index: "Conference talk",
            },
            {
              title: "Tokens are a contract, not a colour palette",
              authors: ["Sara Meridian"],
              source: "Systems Weekly",
              year: 2024,
              index: "Article",
            },
            {
              title: "What a checkout audit actually finds",
              authors: ["Sara Meridian", "Tomas Renner"],
              source: "Commerce UX Review",
              year: 2023,
              pages: "18-24",
              index: "Case study",
            },
            {
              title: "Accessible forms for anxious people",
              authors: ["Sara Meridian"],
              source: "A11y Meetup Lisbon",
              year: 2023,
              index: "Talk",
            },
          ],
        },
      ],
    },

    /* ── /contact ──────────────────────────────────────────────────────── */
    {
      title: "Contact",
      slug: "contact",
      description:
        "How to reach Sara Meridian about product design and frontend work.",
      sections: [
        {
          kind: "pageHeader",
          title: "Contact",
          blurb:
            "Taking on one project at a time. Email is the fastest way to reach me.",
        },
        {
          kind: "cardGrid",
          heading: "Sara Meridian",
          intro: "Product Designer & Frontend Developer · Remote, CET (UTC+1)",
          titleLevel: 4,
          items: [
            {
              eyebrow: "Email",
              title: "sara@example.com",
              links: [{ label: "Open Email", href: "mailto:sara@example.com" }],
            },
            {
              eyebrow: "Website",
              title: "example.com/sara",
              links: [
                { label: "Open Website", href: "https://example.com/sara" },
              ],
            },
            {
              eyebrow: "GitHub",
              title: "example.com/sara-meridian",
              links: [
                {
                  label: "Open GitHub",
                  href: "https://example.com/sara-meridian",
                },
              ],
            },
            {
              eyebrow: "LinkedIn",
              title: "example.com/in/sara-meridian",
              links: [
                {
                  label: "Open LinkedIn",
                  href: "https://example.com/in/sara-meridian",
                },
              ],
            },
            {
              eyebrow: "Booking",
              title: "A 20-minute intro call",
              links: [
                {
                  label: "Open Booking",
                  href: "https://example.com/sara/intro",
                },
              ],
            },
          ],
        },
        {
          kind: "prose",
          heading: "What to put in the first email",
          background: "alt",
          paragraphs: [
            "What the product does, who it is for, and what is going wrong. One paragraph is plenty — I will ask the rest.",
            "If you already have a deadline or a budget range, say so. It saves us both a round of polite guessing, and I would rather tell you quickly that I am the wrong fit.",
          ],
          actions: [
            {
              label: "Email sara@example.com",
              href: "mailto:sara@example.com",
              variant: "primary",
            },
          ],
        },
      ],
    },
  ],
};
