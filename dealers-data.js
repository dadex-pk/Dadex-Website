/* ============================================================
   DADEX DEALER & DISTRIBUTOR DIRECTORY
   ============================================================

   VERIFY BEFORE LAUNCH: Burhani Traders' address matches the Dadex Islamabad Sales
   Office on contact.html, and Taheri Sanitary / Burhani Traders phones share the
   same last 7 digits. Confirm both with Sales.

   This is the ONLY file that needs to be updated when replacing
   placeholder records with approved dealer data.

   SCHEMA (read by js/dealers.js):
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
     whatsapp     : WhatsApp number (shown only if the card template has data-field="whatsapp")


   CURRENT CONTENTS
     · DISTRIBUTORS — 5 approved records
     · DEALERS      — 6 placeholder records (hidden), awaiting official list
   ============================================================ */

window.DADEX_DEALERS = [

  /* ============================================================
     DISTRIBUTORS — Approved records
     Last updated: 15 October 2026
     ============================================================ */

  {
    name: "Taheri Sanitary",
    type: "Distributor",
    contactName: "Mr. Yousuf Taheri",
    province: "Sindh",
    city: "Karachi",
    area: "DHA Phase V",
    address: "Plot # 2C, Shop # 5, 27th Tauheed Commercial Street, DHA Phase V, Karachi",
    phone: "0300-8203417",
    email: "taherisanitary7@gmail.com",
    products: ["Thermoline"],
    active: true
  },

  {
    name: "Burhani Traders",
    type: "Distributor",
    contactName: "Mr. Juzer",
    province: "Islamabad Capital Territory",
    city: "Islamabad",
    area: "PWD Road",
    address: "C786, Block C, Sector C, Main PWD Road, Islamabad",
    phone: "0303-8203417",
    email: "juzer@burhanitraders.com",
    products: ["Polyduct"],
    active: true
  },

  {
    name: "Galaxy Pipe Store",
    type: "Distributor",
    contactName: "Mr. Akhtar Nawaz",
    province: "Sindh",
    city: "Karachi",
    area: "DHA Phase V",
    address: "Shop No. 6E, Building No. 7E, 27th Tauheed Commercial Street, DHA Phase V, Karachi",
    phone: "0300-2929567",
    email: "akhtarnawaz38@gmail.com",
    products: ["Polydex", "Nikasi"],
    active: true
  },

  {
    name: "M. Ilyas & Co.",
    type: "Distributor",
    contactName: "Mr. Ilyas",
    province: "Punjab",
    city: "Lahore",
    area: "Qaddafi Market",
    address: "11, Qaddafi Market Nishtar (Brandreth) Road, Lahore, Pakistan",
    phone: "042-37668390",
    email: "milyascom11@gmail.com",
    products: ["Aquadex"],
    active: true
  },

  {
    name: "Tufail & Sons",
    type: "Distributor",
    contactName: "Mr. Riaz",
    province: "Punjab",
    city: "Lahore",
    area: "Ferozpur Road",
    address: "13-A Ferozpur Road near Tamaseel Hall, Lahore, Pakistan, 54000",
    phone: "0325-6222206",
    email: "info@mtsgroup.com.pk",
    products: [
      "Polydex Premium",
      "Flow Line",
      "Inspection Chambers",
      "Manholes",
      "Non-Return Valves"
    ],
    active: true
  },

  /* ============================================================
     DEALERS — Placeholder records
     Hidden (active: false) until replaced with the official dealer list.
     Set active: true only for real, approved records.
     ============================================================ */
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
    active: false
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
    active: false
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
    active: false
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
    active: false
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
    active: false
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
    active: false
  },
];
