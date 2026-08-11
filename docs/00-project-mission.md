# PatExpressShipping — Project Mission

## 1. Purpose

PatExpressShipping is a shipping business connecting the United States and Burkina Faso.

The website and operational system exist to make it simple for a customer to:

```text
create a shipment request
→ hand over or send the package to PatExpressShipping
→ receive an official quote
→ pay the shipping fee
→ follow the shipment
→ know when it is ready for pickup
→ complete delivery
```

The product must support shipments in both directions:

```text
United States → Burkina Faso
Burkina Faso → United States
```

This bidirectional reality is a core business rule.

The system must never assume that all shipments originate in the United States or that all shipments terminate in Burkina Faso.

---

# 2. Core Product Goal

The primary goal is:

> Make shipping between the United States and Burkina Faso clear, trustworthy, and easy to follow for both customers and staff.

The customer experience should feel simple even when the operational workflow behind it is complex.

The product should reduce confusion around:

- creating a shipment;
- package reception;
- quotation;
- payment;
- shipment progress;
- destination arrival;
- pickup readiness;
- final delivery.

---

# 3. Core Business Flow

The canonical shipment lifecycle is direction-neutral.

```text
Customer creates shipment request
        ↓
Package is received at origin
        ↓
Package is weighed and reviewed
        ↓
Official quote is created
        ↓
Payment is recorded
        ↓
Payment is confirmed
        ↓
Shipment enters transit
        ↓
Shipment arrives at destination
        ↓
Shipment becomes ready for pickup
        ↓
Shipment is delivered
```

The same lifecycle applies to both:

```text
US_TO_BF
BF_TO_US
```

Geography belongs to the shipment direction.

Lifecycle status describes what has happened operationally.

---

# 4. Shipment Direction

Every shipment must explicitly identify its direction.

Approved MVP directions:

```text
US_TO_BF
United States → Burkina Faso

BF_TO_US
Burkina Faso → United States
```

Direction must not be inferred from:

- customer names;
- phone numbers;
- city names;
- notes;
- payment method;
- staff location.

Direction is authoritative shipment data.

---

# 5. Shipment Lifecycle

The intended geography-neutral lifecycle is:

```text
AWAITING_PACKAGE
PACKAGE_RECEIVED
AWAITING_QUOTE
AWAITING_PAYMENT
PAYMENT_CONFIRMED
IN_TRANSIT
ARRIVED_DESTINATION
READY_FOR_PICKUP
DELIVERED
CANCELLED
```

The lifecycle should not contain geography-specific names such as:

```text
PACKAGE_RECEIVED_US
IN_TRANSIT_TO_BF
ARRIVED_BF
```

Direction plus lifecycle status together provide the full meaning.

Example:

```text
US_TO_BF + PACKAGE_RECEIVED
→ package received at the United States origin
```

```text
BF_TO_US + PACKAGE_RECEIVED
→ package received at the Burkina Faso origin
```

Likewise:

```text
US_TO_BF + ARRIVED_DESTINATION
→ arrived in Burkina Faso
```

```text
BF_TO_US + ARRIVED_DESTINATION
→ arrived in the United States
```

---

# 6. Customers

Customers do not require an account for the MVP.

A customer should be able to:

- create a shipment request;
- provide sender information;
- provide recipient information;
- declare shipment contents;
- choose how the package will reach PatExpressShipping at origin;
- receive a tracking number;
- track shipment progress publicly.

The customer should not need to understand internal operational terminology.

The customer-facing experience is French-first.

---

# 7. Shipment Intake

A customer may currently get the package to PatExpressShipping through:

```text
DROP_OFF
MAIL_IN
```

These concepts are interpreted relative to the shipment origin.

For example:

```text
US_TO_BF + DROP_OFF
→ customer drops package at the U.S. origin operation
```

```text
BF_TO_US + DROP_OFF
→ customer drops package at the Burkina Faso origin operation
```

Do not encode origin country into the intake method itself.

---

# 8. Shipment Contents

One shipment may contain multiple declared items.

Each declared item preserves:

- description;
- category;
- quantity;
- optional declared value.

Declared item data belongs to the shipment's historical request snapshot.

The system should not silently rewrite declared contents after shipment creation.

---

# 9. Quotation

A shipment does not become payable immediately after customer submission.

The operational sequence is:

```text
package physically received
→ staff weighs package
→ staff reviews shipment
→ official quote created
```

The quotation preserves historical commercial truth.

It must preserve:

- measured weight;
- rate per kilogram;
- final quoted amount;
- currency;
- quotation timestamp.

An old shipment must never be recalculated using a newer future rate.

The final quoted amount is authoritative even when it differs from:

```text
weight × rate
```

because future business rules may include:

- rounding;
- minimum charges;
- negotiated pricing;
- special handling.

---

# 10. Payment

The sender is responsible for shipping fees under the current MVP.

Supported payment methods:

```text
ZELLE
CASH
```

Do not assume that registering a payment means money has been received.

The financial lifecycle is separate:

```text
PENDING
→ CONFIRMED
```

or:

```text
PENDING
→ CANCELLED
```

Payment creation and payment confirmation are different business events.

A confirmed payment must preserve:

- payment method;
- amount;
- currency;
- Zelle identity when applicable;
- confirmation timestamp;
- staff member who confirmed the payment.

Payment history must not be reduced to shipment status alone.

---

# 11. Staff Operations

PatExpressShipping staff operate shipments through protected internal routes.

Current staff roles:

```text
ADMIN
STAFF
```

Both roles may currently perform normal shipment operations.

The staff product exists to help employees:

- find shipments;
- inspect shipment details;
- receive packages;
- create quotations;
- record payment attempts;
- confirm payments;
- advance physical shipment milestones;
- complete delivery.

The internal staff product should remain operational and focused.

It should not become an analytics or enterprise administration platform unless separately scoped.

---

# 12. Staff Authentication

Staff accounts are individual persisted identities.

Staff must not self-register publicly.

Accounts are created deliberately through trusted operational tooling.

Passwords must:

- never be stored in plaintext;
- never be logged;
- never be exposed in sessions;
- use secure one-way hashing.

Sensitive staff mutations require:

```text
authenticated session
+
currently active persisted StaffUser
```

Disabling a staff account must revoke operational access even if an old session token still exists.

---

# 13. Shipment Status Operations

Staff must not have a generic arbitrary status dropdown.

The workflow should guide staff through the one valid operational next step.

Specialized business operations own specialized transitions.

For example:

```text
quotation creation
→ AWAITING_PAYMENT
```

and:

```text
payment confirmation
→ PAYMENT_CONFIRMED
```

must not be bypassed through a generic status updater.

Physical shipment transitions should remain explicit and controlled.

---

# 14. Historical Integrity

Historical information must be treated as business truth.

Once recorded, important facts should not be silently overwritten.

Examples:

- package reception time;
- quotation snapshot;
- payment confirmation;
- destination arrival;
- pickup readiness;
- delivery time;
- cancellation time;
- payment history;
- confirming staff identity.

If persisted historical state becomes inconsistent, the system should fail safely rather than automatically inventing or repairing history.

---

# 15. Concurrency

The system must assume that two staff members may act on the same shipment at nearly the same time.

Business mutations must not rely only on:

```text
read current state
→ check
→ blindly update later
```

Sensitive transitions should conditionally enforce the expected current state at write time.

If another operation has already changed the business state:

```text
newer state wins
```

The application should return a conflict and ask staff to refresh.

Do not silently overwrite concurrent changes.

---

# 16. Public Tracking

Customers should be able to track shipments without creating accounts.

Public tracking exists to answer:

> Where is my shipment now?

It must expose only public-safe information such as:

- tracking number;
- current customer-facing status;
- concise status description;
- persisted shipment milestones.

Public tracking must not expose:

- internal shipment ID;
- sender contact details;
- recipient contact details;
- notes;
- item contents;
- declared values;
- weight;
- quotation amounts;
- payment amounts;
- payment method;
- Zelle identity;
- staff identities;
- authentication information.

Public tracking reveals the journey, not the internal business record.

---

# 17. Tracking Numbers

Tracking numbers use the PatExpressShipping format:

```text
PAT-YYYY-XXXXXXXX
```

The tracking number must remain direction-neutral.

Do not encode route direction into tracking-number syntax.

For example, do not introduce:

```text
PAT-US-...
PAT-BF-...
```

Direction belongs to shipment data.

---

# 18. Customer-Facing Language

The public product is French-first.

Customer-visible:

- labels;
- validation errors;
- status descriptions;
- calls to action;
- confirmations;
- tracking information

should use clear natural French.

Internal code should remain conventional English:

```text
senderName
ShipmentStatus
quotedAmount
createShipmentPayment
```

Principle:

```text
Developer language → English
Customer experience → French
```

---

# 19. Architecture

The project should preserve clear boundaries.

Customer shipment creation:

```text
UI
→ Server Action
→ Validation
→ Service
→ Prisma
```

Staff mutations:

```text
Protected UI
→ Server Action
→ requireStaff()
→ Service
→ Prisma
```

Public tracking:

```text
Public UI
→ Public Tracking Service
→ focused Prisma read
```

Do not move business rules into React components.

Do not allow clients to control:

- staff identity;
- shipment current status;
- confirmation timestamps;
- historical milestones;
- server-owned fields.

---

# 20. Technology

Current technical foundation:

```text
Next.js App Router
React
TypeScript
Tailwind CSS
Prisma
PostgreSQL / Neon
NextAuth Credentials
Zod
React Hook Form where appropriate
```

Use existing project tools before adding dependencies.

Prefer small focused modules over broad abstractions.

---

# 21. Product Design Principles

The public website should feel:

- modern;
- attractive;
- trustworthy;
- simple;
- clear;
- mobile-friendly.

The staff interface should feel:

- operational;
- fast;
- calm;
- easy to scan;
- difficult to misuse.

Avoid unnecessary complexity.

The customer should not need to understand the internal state machine.

The staff member should not need to manually reason about arbitrary status transitions.

---

# 22. MVP Boundaries

The PatExpressShipping MVP includes:

- bidirectional shipments between the United States and Burkina Faso;
- French public website;
- guest shipment creation;
- shipment item declaration;
- unique tracking numbers;
- staff authentication;
- staff shipment list;
- protected shipment workspace;
- package receipt workflow;
- manual quotation;
- manual payment recording;
- Zelle and cash payment workflows;
- payment confirmation;
- physical shipment lifecycle updates;
- public shipment tracking;
- responsive customer and staff interfaces.

---

# 23. Explicitly Outside the Current MVP

Unless separately contracted, do not add:

- `/admin`;
- staff-management UI;
- customer accounts;
- Stripe;
- Orange Money shipping payments;
- automated Zelle reconciliation;
- refunds;
- payment disputes;
- analytics dashboards;
- revenue reporting;
- CSV/accounting exports;
- generic shipment editing;
- arbitrary status dropdowns;
- advanced cancellation workflows;
- GPS tracking;
- maps;
- live carrier integrations;
- barcode scanning;
- QR scanning;
- warehouse management;
- inventory management;
- sophisticated TrackingEvent infrastructure;
- estimated delivery dates;
- automated SMS;
- automated WhatsApp;
- broad notification systems;
- generic multi-country shipping infrastructure;
- arbitrary route configuration.

These may become future paid enhancements.

---

# 24. Scope Discipline

PatExpressShipping is a client operational product.

It must have a finish line.

When the agreed shipping workflow works reliably from customer request through final delivery and public tracking, the MVP is complete.

Do not transform the project into a general-purpose logistics SaaS without a new business decision and scope.

When new requests arise, ask:

```text
Is this required to complete the current shipping workflow?
```

If not:

```text
future paid enhancement
```

---

# 25. Current Domain Correction

The project was initially implemented under the assumption:

```text
United States → Burkina Faso only
```

The actual business is:

```text
United States ↔ Burkina Faso
```

The current corrective program is therefore:

```text
6A — Bidirectional Shipment Domain Foundation
6B — Bidirectional Shipment Request Flow
6C — Bidirectional Staff Operations
6D — Bidirectional Public Tracking
6E — Bidirectional UI Adaptation
5C — Final Integration and MVP Launch Validation
```

This correction must change the original directional assumption without expanding the product into unrelated features.

---

# 26. Definition of Done

The MVP is ready when a real shipment can complete either route:

```text
United States → Burkina Faso
```

or:

```text
Burkina Faso → United States
```

through the complete system:

```text
customer creates request
→ receives tracking number
→ origin receives package
→ staff prepares quote
→ payment is recorded
→ payment is confirmed
→ shipment enters transit
→ shipment arrives at destination
→ shipment becomes ready for pickup
→ shipment is delivered
→ customer can track progress publicly
```

and the product preserves:

- privacy;
- historical correctness;
- concurrency safety;
- staff authorization;
- clear customer communication;
- explicit shipment direction.

Once both directions complete that journey reliably, the core PatExpressShipping MVP is finished.
