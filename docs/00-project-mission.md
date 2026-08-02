# PatExpressShipping — Project Mission

## Read This Before Every Ticket

Before implementing any feature, remember what this product is.

Do not optimize for code.

Optimize for the customer experience.

---

# Product Mission

PatExpressShipping exists to make shipping packages from the United States to Burkina Faso feel simple, trustworthy, and transparent.

The customer should never wonder:

- What do I do next?
- Where is my package?
- How much do I owe?
- What happens after I submit my shipment?

Every screen should answer those questions naturally.

---

# Product Goal

The website should make shipping a package feel effortless.

The ideal customer journey is:

Create Shipment

↓

Receive Confirmation

↓

Bring or Mail Package

↓

Receive Shipping Quote

↓

Pay

↓

Track Shipment

↓

Pick Up in Burkina Faso

Every feature should improve this flow.

If a feature does not improve this journey, question whether it belongs in the MVP.

---

# Design Philosophy

The interface should feel:

- simple
- calm
- trustworthy
- premium
- obvious

Avoid overwhelming the customer.

Prefer fewer choices.

Prefer one clear primary action.

Customers should always know what the next step is.

---

# UI Philosophy

Pages should be spacious.

Large typography.

Clear hierarchy.

Generous whitespace.

Professional photography.

Modern cards.

Strong call-to-action buttons.

Simple forms.

No unnecessary decoration.

The customer should feel confidence before reading.

---

# UX Principles

Never make the customer think.

Every page should answer:

What is happening?

Why?

What should I do next?

The next action should always be obvious.

---

# Business Philosophy

This is not a shipping website.

It is a shipment management platform.

The public website exists to:

- build trust
- collect shipment requests
- allow shipment tracking

The operational system exists to:

- manage shipments
- manage payments
- manage package movement

Always distinguish marketing from operations.

---

# Domain Philosophy

Model the business before writing code.

Business Workflow

↓

Business Rules

↓

Entities

↓

Relationships

↓

Services

↓

UI

Never reverse this order.

---

# Historical Data Philosophy

Shipment history is sacred.

A shipment records what happened at that moment in time.

Future edits must never rewrite historical shipments.

Historical truth always wins.

---

# Architecture Philosophy

Prefer small focused services.

Prefer explicit business names.

Avoid generic helper classes.

One service should solve one business problem.

Business rules belong in services.

UI should remain thin.

---

# Development Philosophy

Do not build everything at once.

Implement the smallest complete vertical slice.

Each ticket should:

- solve one business problem
- preserve domain correctness
- avoid unnecessary abstraction
- leave the project in a deployable state

---

# Code Quality

Favor readability over cleverness.

Prefer explicit names.

Prefer composition.

Keep functions small.

Avoid duplicated business logic.

Never guess business rules.

If a rule is unclear, stop and report the ambiguity.

---

# MVP Priorities

The MVP succeeds if a customer can:

1. Create a shipment.

2. Receive a shipping quote.

3. Pay.

4. Track the shipment.

5. Pick up the shipment in Burkina Faso.

Everything else is secondary.

---

# Success Metric

When a first-time visitor opens the website, they should immediately understand:

"We help you ship packages from the United States to Burkina Faso."

When they leave the website, they should feel:

"This looks simple.
I trust these people.
I know exactly what to do."

Every implementation decision should move the product toward that experience.
