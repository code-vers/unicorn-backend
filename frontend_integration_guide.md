# API Integration Guide for Frontend Engineer

This document outlines the key API integrations required to build the frontend screens for **Unicorn Rent a Car**. Please refer to the interactive Swagger UI (`/docs` or `/api-docs` depending on the server setup) for exact request/response schemas.

> [!TIP]
> **Authentication:**
> Pass the JWT token in the header as `Authorization: Bearer <your_token>` for all endpoints marked with `(Auth Required)`.

---

## 1. Advanced Vehicle Search
To implement the search filter (Dates, Features, Seats, Transmission, etc.):

**Endpoint:** `GET /api/v1/vehicles`
**Query Parameters:**
- `pickupDate` (string, ISO format) & `dropOffDate` (string, ISO format): Automatically filters out cars that are booked during this period.
- `seatingCapacity` (number): Pass a number. E.g., `seatingCapacity=6` will fetch vehicles with 6 or more seats.
- `featureIds` (array of strings): E.g., `?featureIds=id1&featureIds=id2`. Filters vehicles that have these specific features.
- `transmission`, `fuelType`, `minPrice`, `maxPrice`, `category`: General filters.

---

## 2. Booking Flow (Checkout)
The checkout process involves taking driver details, billing info, and confirming the booking.

### Step 2.1: Fetch Paid Add-ons / Extras
**Endpoint:** `GET /api/v1/features?isAddon=true`
Displays paid extras (e.g., GPS, Child Seat) that the user can select during checkout.

### Step 2.2: Calculate Booking Cost
**Endpoint:** `POST /api/v1/bookings/calculate` (No Auth Required)
Use this whenever the user changes dates, locations, or add-ons to show the live price breakdown.
```json
{
  "vehicleId": "uuid",
  "pickupLocationId": "uuid",
  "dropOffLocationId": "uuid",
  "pickupDate": "2026-03-28T11:10:00Z",
  "dropOffDate": "2026-03-29T15:10:00Z",
  "hasGps": true
}
```

### Step 2.3: Confirm Booking
**Endpoint:** `POST /api/v1/bookings` (Auth Required)
Submit the complete booking along with driver details and billing info.
```json
{
  "vehicleId": "uuid",
  // ... (calculate payload),
  "driverDetails": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+254...",
    "dateOfBirth": "1990-01-01", 
    "message": "Optional note"
  },
  "billingInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+254...",
    "address": "Street 1",
    "city": "Nairobi",
    "country": "Kenya"
  }
}
```

---

## 3. Manage & Extend Bookings
To implement the "Modify Your Booking" modal.

### Step 3.1: Modify Booking (Change Date/Extras)
**Endpoint:** `PATCH /api/v1/bookings/{id}/modify` (Auth Required)
When the user selects a new return date or adds an extra driver.
```json
{
  "dropOffDate": "2026-06-08T10:00:00Z",
  "hasFullInsurance": true
}
```
*Note: This automatically recalculates the `totalAmount` and changes `paymentStatus` to `PENDING`.*

### Step 3.2: Pay & Extend
**Endpoint:** `POST /api/v1/bookings/{id}/extend-payment` (Auth Required)
Process the payment for the extra balance generated in Step 3.1.
```json
{
  "paymentMethod": "MPESA",
  "amount": 181.40 
}
```

---

## 4. Trip Management
To populate the 5 tabs in the Trip Management page:

- **Pick-Up Instructions / Return Instructions / Airport Meet & Greet:**
  Fetch from settings. `GET /api/v1/settings`. Look for keys like `TRIP_PICKUP_INSTRUCTIONS`.
  
- **Office Locations:**
  Fetch from `GET /api/v1/locations`.

- **Driver Contacts:**
  If the user booked a chauffeur, fetch their details from `GET /api/v1/bookings/my-bookings` (Auth Required). The response will include an `assignedDriver` object (Name, Phone, WhatsApp, Photo).

---

## 5. Support & Contact Forms (Get in Touch)
To handle both public contact forms and client dashboard support tickets.

**Endpoint:** `POST /api/v1/support` (Auth Optional)

> [!NOTE]
> If the user is logged in (Client Dashboard), send the Bearer token and just the `subject` and `message`. The backend will automatically extract their name and email from the token. If they are not logged in (Public Website), omit the token and send all fields.

```json
{
  "name": "Sarah User", // Optional if logged in
  "email": "sarah@example.com", // Optional if logged in
  "phone": "+254...",
  "subject": "Question about borders",
  "message": "Can I take the vehicle outside Kenya?"
}
```

---

## 6. Notifications
**Endpoint:** `GET /api/v1/notifications` (Auth Required)
Fetch in-app notifications (Booking confirmations, Payment receipts) for the logged-in user. Call `PATCH /api/v1/notifications/{id}/read` when clicked.
