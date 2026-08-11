# PatExpressShipping — Project Mission

## 1. Purpose

PatExpressShipping is a shipping service connecting the **United States and Burkina Faso in both directions**.

The software exists to make that real-world shipping operation easier to manage for both customers and staff.

The platform must support:

```text
United States → Burkina Faso
Burkina Faso → United States
```

The product is not simply a website.

It is the operational system supporting the lifecycle of a shipment from the customer's initial request until final delivery.

---

## 2. The Business We Are Modeling

PatExpressShipping physically moves packages between two countries:

```text
United States ↔ Burkina Faso
```

A shipment always has:

- an origin;
- a destination;
- a sender;
- a recipient;
- one or more items;
- a direction;
- an operational lifecycle;
- a unique tracking number.

For the current business, there are exactly two shipment directions:

```text
US_TO_BF
BF_TO_US
```

The system should model the real shipping operation faithfully without unnecessarily generalizing beyond the business PatExpressShipping actually performs.

---

## 3. Core Shipment Lifecycle

Regardless of direction, a shipment follows the same conceptual lifecycle.

```text
Customer creates shipment request
        ↓
Package is received at origin
        ↓
Package is prepared for quotation
        ↓
Package is weighed and quoted
        ↓
Payment is recorded
        ↓
Payment is confirmed
        ↓
Package enters international transit
        ↓
Package arrives at destination
        ↓
Package becomes ready for pickup
        ↓
Package is delivered
```

The lifecycle must remain **geography-neutral**.

For example:

```text
PACKAGE_RECEIVED
```

means:

```text
package received at the shipment's origin
```

The shipment direction determines whether that origin is the United States or Burkina Faso.

Likewise:

```text
ARRIVED_DESTINATION
```

means:

```text
package arrived in the destination country
```

The status itself should not encode a particular country.

---

## 4. Direction and Lifecycle Are Separate Concepts

A fundamental domain principle is:

```text
ShipmentDirection
        +
ShipmentStatus
        =
complete operational meaning
```

For example:

```text
US_TO_BF + PACKAGE_RECEIVED
```

means:

> The package has been received at the United States origin.

While:

```text
BF_TO_US + PACKAGE_RECEIVED
```

means:

> The package has been received at the Burkina Faso origin.

Similarly:

```text
US_TO_BF + ARRIVED_DESTINATION
```

means arrival in Burkina Faso.

And:

```text
BF_TO_US + ARRIVED_DESTINATION
```

means arrival in the United States.

Geography belongs to the shipment direction.

Lifecycle state describes what has happened to the shipment.

These concepts should remain separate throughout the architecture.

---

## 5. Customer Experience

The customer experience should remain intentionally simple.

A customer should not need an account to create or track a shipment.

The essential public experience is:

```text
Create shipment request
        ↓
Receive tracking number
        ↓
Give package to PatExpressShipping
        ↓
PatExpressShipping weighs and processes package
        ↓
Customer receives/accepts quotation through the business process
        ↓
Payment is handled
        ↓
Shipment travels
        ↓
Customer tracks progress
        ↓
Package is delivered
```

The software should reduce uncertainty without forcing customers through unnecessary account creation or complicated logistics interfaces.

---

## 6. Guest Shipment Creation

Shipment creation is designed to be accessible without authentication.

The customer provides the information necessary for PatExpressShipping to understand and process the shipment.

This includes, as appropriate:

- shipment direction;
- intake method;
- sender information;
- recipient information;
- destination information;
- package/item descriptions;
- quantities;
- optional declared values;
- relevant customer instructions.

The system generates the tracking number.

The customer does not choose:

- shipment status;
- quotation;
- payment confirmation;
- operational timestamps;
- internal notes;
- staff identity.

Those remain controlled by the system or authorized staff.

---

## 7. Tracking Numbers

Every shipment receives a unique tracking number.

Tracking numbers provide a stable public reference for the shipment.

They must not encode business assumptions that may later change.

In particular, tracking numbers should not encode shipment direction.

A tracking number identifies the shipment.

The shipment record contains the business meaning.

---

## 8. Quotation

PatExpressShipping does not necessarily know the final shipment price when the customer submits the initial request.

The operational flow is therefore:

```text
Shipment request
        ↓
Physical package received
        ↓
Package measured/weighed
        ↓
Quotation recorded
        ↓
Customer payment
```

Quotation is a historical business fact.

Once recorded, the system should preserve:

- measured weight;
- rate;
- quoted amount;
- currency;
- quotation timestamp.

The system should not silently rewrite historical quotation information.

---

## 9. Payment

Payment is distinct from quotation.

A quotation answers:

> How much does this shipment cost?

A payment record answers:

> How is this amount being paid?

Payment confirmation answers:

> Has PatExpressShipping actually confirmed receipt of those funds?

These concepts must remain separate.

Creating a payment record must not automatically imply that payment has been received.

Only an explicit confirmation should move the shipment into the paid state.

Historical payment information should be preserved.

---

## 10. Staff Operations

PatExpressShipping staff require a focused operational workspace.

The staff system exists to operate shipments, not to become a large enterprise administration platform.

Authorized staff should be able to perform the essential shipment workflow:

```text
Find shipment
        ↓
Open shipment
        ↓
Review shipment information
        ↓
Record operational progression
        ↓
Create quotation when appropriate
        ↓
Record payment
        ↓
Confirm payment
        ↓
Advance shipment through transit
        ↓
Confirm arrival
        ↓
Mark ready for pickup
        ↓
Confirm delivery
```

The interface should guide staff toward the **next legitimate action** rather than presenting unrestricted editing controls.

---

## 11. Status Changes Are Business Operations

Shipment status must not be treated as an arbitrary editable field.

The system should not provide a generic:

```text
<select status>
```

that allows staff to jump between lifecycle states.

Instead, the application should expose meaningful business operations such as:

```text
Receive package
Prepare quotation
Confirm payment
Start transit
Confirm destination arrival
Mark ready for pickup
Confirm delivery
```

Each operation should enforce the valid lifecycle transition.

The system should make invalid, skipped, backward, or contradictory transitions difficult or impossible.

---

## 12. Historical Integrity

A shipment is a historical business record.

The system should preserve what actually happened.

Important historical information includes:

- shipment identity;
- shipment direction;
- tracking number;
- sender snapshot;
- recipient snapshot;
- item snapshot;
- quotation snapshot;
- payment history;
- package-received milestone;
- payment-confirmation milestone;
- destination-arrival milestone;
- pickup-readiness milestone;
- delivery milestone;
- cancellation milestone.

Historical timestamps should represent actual persisted events.

The application should never fabricate milestones merely to make a timeline look complete.

---

## 13. Concurrency and Operational Safety

Shipping operations can be performed by multiple staff members.

The system must assume that two people may attempt to modify the same shipment simultaneously.

Critical mutations should therefore verify that the business state they expect is still current before committing a change.

When another operation wins first, the system should prefer:

```text
reject + refresh
```

over silently overwriting newer information.

Historical correctness is more important than making every button press succeed.

---

## 14. Public Tracking

Customers should be able to track shipments without authentication.

Public tracking should answer:

```text
What is the current state of my shipment?
```

and:

```text
What important shipment milestones have actually occurred?
```

It should not expose the internal shipment record.

Public tracking may expose appropriate information such as:

- tracking number;
- customer-friendly current status;
- customer-friendly status explanation;
- persisted public milestones.

It must not expose private operational or personal information unnecessarily.

---

## 15. Privacy Boundary

Public shipment tracking must never become an accidental shipment database.

Information such as the following should remain private unless a future business requirement explicitly changes that decision:

- sender contact information;
- recipient contact information;
- private notes;
- internal notes;
- staff identities;
- authentication information;
- internal database IDs;
- payment identity details;
- sensitive operational metadata.

The public tracking result should be deliberately constructed rather than exposing a raw Shipment database object.

---

## 16. Authentication

Customers do not require accounts for the MVP.

Staff operations do require authentication.

Staff identity must originate from the authenticated server session, never from customer-controlled form input.

Sensitive mutations must verify that the staff account still exists and remains active.

A previously issued session must not permanently grant access after the corresponding staff account has been disabled.

---

## 17. Product Boundaries

PatExpressShipping should remain a focused operational product.

The MVP is not intended to become:

- a generic logistics SaaS;
- a freight marketplace;
- a carrier-management platform;
- a customer social portal;
- an accounting system;
- an ERP;
- a CRM;
- a warehouse-management system;
- a GPS tracking platform;
- a generic international shipping engine.

It exists to support **PatExpressShipping's actual operation between the United States and Burkina Faso**.

---

## 18. No `/admin` Requirement

A broad administration dashboard is not part of the core MVP.

The staff workspace should provide the operational capabilities necessary to process shipments.

Features such as:

- analytics dashboards;
- revenue reporting;
- employee management;
- advanced configuration;
- operational metrics;
- business intelligence;
- bulk administration;

are separate product scope and should not be introduced merely because an authenticated staff area exists.

They may become future paid enhancements.

---

## 19. Architecture Principle

The application should preserve clear responsibility boundaries.

The preferred flow is:

```text
UI
 ↓
Server Action / Server Boundary
 ↓
Validation
 ↓
Domain / Service
 ↓
Prisma
 ↓
PostgreSQL
```

Each layer should have a clear responsibility.

### UI

Responsible for:

- presentation;
- user interaction;
- accessibility;
- displaying safe results and errors.

### Server Boundary

Responsible for:

- authentication when required;
- translating FormData/request input;
- calling the appropriate service;
- returning safe application states.

### Validation

Responsible for:

- validating untrusted input;
- normalization;
- structural rules;
- customer-facing validation messages.

### Domain / Service Layer

Responsible for:

- business invariants;
- lifecycle rules;
- historical correctness;
- concurrency protection;
- orchestration of persistence.

### Prisma / Database

Responsible for:

- durable persistence;
- relations;
- uniqueness;
- transactional integrity;
- historical records.

Business rules should not be unnecessarily duplicated across these layers.

---

## 20. Declarative Domain Policies

Where a business lifecycle can be represented declaratively, prefer explicit domain policies over scattered imperative conditionals.

For example:

```text
status → allowed next statuses
```

is preferable to repeating lifecycle knowledge throughout the application.

Likewise, concepts such as:

- terminal states;
- staff-controlled transitions;
- quotation eligibility;
- payment eligibility;

should have centralized definitions.

This makes the domain easier to inspect, test, and evolve.

---

## 21. Database Principle

The database should model business facts, not UI convenience.

Persistent fields should exist because they represent information PatExpressShipping needs to retain historically.

Do not add fields merely because they make a component easier to render.

Before adding persistent domain state, ask:

> What historical information must this feature preserve?

If the answer is unclear, the domain should be examined before the migration is written.

---

## 22. Avoid Premature Generalization

PatExpressShipping currently operates between:

```text
United States
Burkina Faso
```

The system should model those two directions cleanly.

Do not prematurely introduce:

- arbitrary countries;
- route configuration engines;
- generic carrier networks;
- country tables;
- international pricing engines;
- generic logistics workflows.

If PatExpressShipping later expands to additional countries, the domain can evolve based on real requirements.

Today's architecture should remain clean enough to evolve without pretending that future requirements are already known.

---

## 23. User Interface Language

The customer-facing and operational product is primarily French.

Customer-facing validation, statuses, instructions, confirmations, errors, and operational staff terminology should therefore be presented clearly in French.

Technical enum values and internal domain terminology may remain in English where appropriate.

Presentation should translate domain concepts without changing their underlying meaning.

---

## 24. Mobile First

A significant portion of customers and staff may use the system from phones.

All essential workflows must therefore remain usable on small screens.

Important operational actions should not require desktop-only layouts.

Responsive behavior is part of functional correctness, not optional decoration.

---

## 25. Accessibility

Core workflows should remain usable through:

- visible labels;
- keyboard navigation;
- appropriate focus behavior;
- semantic HTML;
- textual status descriptions;
- accessible validation errors;
- accessible pending states.

Color should never be the only way important business state is communicated.

---

## 26. Engineering Restraint

The project should prefer:

```text
small
explicit
tested
domain-correct
```

over:

```text
large
generic
clever
speculative
```

New features should solve demonstrated business requirements.

Avoid introducing infrastructure simply because it might someday be useful.

Every additional abstraction, table, workflow, or dependency carries long-term maintenance cost.

---

## 27. MVP Success

The MVP succeeds when PatExpressShipping can reliably operate a real shipment in either direction:

```text
United States → Burkina Faso
```

or:

```text
Burkina Faso → United States
```

from initial customer request through final delivery.

A successful end-to-end workflow means:

```text
customer submits shipment
        ↓
tracking number generated
        ↓
staff receives package at origin
        ↓
staff records quotation
        ↓
payment is recorded
        ↓
payment is confirmed
        ↓
shipment enters transit
        ↓
shipment arrives at destination
        ↓
shipment becomes ready for pickup
        ↓
shipment is delivered
        ↓
customer can observe appropriate progress publicly
```

If that workflow is reliable, secure, understandable, and operationally useful, the MVP has accomplished its mission.

Everything beyond that should earn its way into the product through real business need.

---

# Mission Statement

**PatExpressShipping's software exists to provide a simple, reliable, and historically trustworthy operational system for moving shipments between the United States and Burkina Faso in both directions—from customer request to final delivery—while keeping the customer experience simple and giving staff only the tools necessary to operate the real business effectively.**
