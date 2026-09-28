/* ============================================================
   DADEX DEALER & DISTRIBUTOR DIRECTORY
   ============================================================

   This is the ONLY file that needs to be updated when replacing
   placeholder records with live, approved dealer data.

   SCHEMA (all fields are read by js/main.js):
     name         : Dealer or distributor business name
     type         : "Dealer" | "Distributor"
     contactName  : Name of the contact person at the dealership
     province     : Province or region
     city         : City
     area         : Area, locality, or neighbourhood
     address      : One-line mailing address
     phone        : Primary phone number (single number)
     email        : Contact email
     products     : Array of product names (must match site product names)
     active       : true | false  (false records are hidden)

   OPTIONAL FIELDS (add only if available and approved):
     mapUrl       : Google Maps share link
     whatsapp     : WhatsApp number (if different from phone)

   Before publishing real records, confirm:
     1. Written consent from the dealer to publish name, address, and phone.
     2. Active status as a Dadex dealer or distributor.
     3. Accurate list of products actually handled by the dealer.

   ============================================================ */

window.DADEX_DEALERS = [
  {
    name: "Dealer A",
    type: "Dealer",
    contactName: "Contact Name",
    province: "Sindh",
    city: "Karachi",
    area: "DHA Phase VI",
    address: "Sample Address, DHA Phase VI, Karachi",
    phone: "021-0000001",
    email: "dealer.a@example.com",
    products: ["Aquadex", "Nikasi"],
    active: true
  },
  {
    name: "Dealer B",
    type: "Dealer",
    contactName: "Contact Name",
    province: "Punjab",
    city: "Lahore",
    area: "Gulberg III",
    address: "Sample Address, Gulberg III, Lahore",
    phone: "042-0000002",
    email: "dealer.b@example.com",
    products: ["Polydex", "Polydex Premium", "Thermoline"],
    active: true
  },
  {
    name: "Distributor A",
    type: "Distributor",
    contactName: "Contact Name",
    province: "Sindh",
    city: "Karachi",
    area: "Saddar",
    address: "Sample Address, Saddar, Karachi",
    phone: "021-0000003",
    email: "distributor.a@example.com",
    products: ["Aquadex", "T-Flex", "Flow Line"],
    active: true
  },
  {
    name: "Dealer C",
    type: "Dealer",
    contactName: "Contact Name",
    province: "Punjab",
    city: "Multan",
    area: "Cantt",
    address: "Sample Address, Cantt, Multan",
    phone: "061-0000004",
    email: "dealer.c@example.com",
    products: ["Nikasi", "Polyduct"],
    active: true
  },
  {
    name: "Distributor B",
    type: "Distributor",
    contactName: "Contact Name",
    province: "Punjab",
    city: "Lahore",
    area: "DHA Phase V",
    address: "Sample Address, DHA Phase V, Lahore",
    phone: "042-0000005",
    email: "distributor.b@example.com",
    products: ["PE Cable Duct", "Electrical Conduits"],
    active: true
  },
  {
    name: "Dealer D",
    type: "Dealer",
    contactName: "Contact Name",
    province: "Islamabad Capital Territory",
    city: "Islamabad",
    area: "Blue Area",
    address: "Sample Address, Blue Area, Islamabad",
    phone: "051-0000006",
    email: "dealer.d@example.com",
    products: ["Aquadex", "Polydex Premium"],
    active: true
  },
  {
    name: "Dealer E",
    type: "Dealer",
    contactName: "Contact Name",
    province: "Punjab",
    city: "Faisalabad",
    area: "Madina Town",
    address: "Sample Address, Madina Town, Faisalabad",
    phone: "041-0000007",
    email: "dealer.e@example.com",
    products: ["Corrugated Sheets"],
    active: true
  },
  {
    name: "Distributor C",
    type: "Distributor",
    contactName: "Contact Name",
    province: "Khyber Pakhtunkhwa",
    city: "Peshawar",
    area: "University Road",
    address: "Sample Address, University Road, Peshawar",
    phone: "091-0000008",
    email: "distributor.c@example.com",
    products: ["T-Flex Gas"],
    active: true
  },
  {
    name: "Dealer F",
    type: "Dealer",
    contactName: "Contact Name",
    province: "Sindh",
    city: "Hyderabad",
    area: "Latifabad",
    address: "Sample Address, Latifabad, Hyderabad",
    phone: "022-0000009",
    email: "dealer.f@example.com",
    products: ["Flow Line", "Manholes", "Catchpits"],
    active: true
  },
  {
    name: "Distributor D",
    type: "Distributor",
    contactName: "Contact Name",
    province: "Balochistan",
    city: "Quetta",
    area: "Jinnah Road",
    address: "Sample Address, Jinnah Road, Quetta",
    phone: "081-0000010",
    email: "distributor.d@example.com",
    products: ["Aquadex", "T-Flex"],
    active: true
  }
];