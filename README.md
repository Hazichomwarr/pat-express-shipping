# PatExpressShipping

A modern shipping platform connecting the United States 🇺🇸 and Burkina Faso 🇧🇫.

Customers can create shipment requests, choose a payment method, and track their packages from pickup to final delivery.

---

## Vision

PatExpressShipping aims to simplify international shipping by providing a transparent, secure, and user-friendly experience.

The platform combines:

- Online shipment creation
- Multiple payment methods
- Shipment tracking
- Admin shipment management

---

# Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Auth.js
- React Hook Form
- Zod
- Resend

---

# MVP Features

## Public Website

- Landing page
- How It Works
- Why Choose Us
- Contact

---

## Customer

- Create Shipment
- View Shipment
- Track Shipment
- Payment History

---

## Payments

- Card
- Zelle
- Orange Money
- Cash (Burkina Faso)

---

## Admin

- Dashboard
- Manage Shipments
- Update Shipment Status
- Confirm Payments
- Customer Management

---

# Business Workflow

Customer

↓

Create Shipment

↓

Shipment Created

↓

Choose Payment Method

↓

Payment Confirmed

↓

Package Received (USA)

↓

In Transit

↓

Arrived in Burkina Faso

↓

Ready for Pickup / Delivery

↓

Delivered

---

# Core Domain Models

- User
- Shipment
- ShipmentItem
- Payment
- TrackingEvent
- Address

---

# Shipment States

```ts
PENDING_PAYMENT;

PAYMENT_CONFIRMED;

RECEIVED_US;

IN_TRANSIT_TO_BF;

ARRIVED_BF;

READY_FOR_PICKUP;

DELIVERED;

CANCELLED;
```

---

# Payment States

```ts
PENDING;

PAID;

FAILED;

REFUNDED;

CANCELLED;
```

---

# Development Philosophy

Build from the business first.

Business Workflow

↓

Data Model

↓

Services

↓

UI

Never build screens before understanding the workflow.

---

# Folder Structure

```
app/
components/
lib/
prisma/
public/
services/
types/
```

---

# Current Progress

- ✅ Landing Page
- ⏳ Authentication
- ⏳ Shipment Creation
- ⏳ Admin Dashboard
- ⏳ Tracking
- ⏳ Payments

---

# Future Improvements

- SMS Notifications
- Email Notifications
- Customer Dashboard
- Shipment Photos
- Invoice Generation
- Multi-language (English / French)
- QR Code Tracking
- Admin Analytics
- Mobile App (Expo)

---

Built with ❤️ by HM Digital Solutions.
