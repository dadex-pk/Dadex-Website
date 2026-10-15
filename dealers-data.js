/* ============================================================
   DADEX DEALER & DISTRIBUTOR DIRECTORY
   ============================================================

   This is the ONLY file that needs to be updated when replacing
   placeholder records with live, approved dealer data.

   SCHEMA (all fields are read by js/dealers.js):
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


   CURRENT CONTENTS
     · DISTRIBUTORS — 5 approved records
     · DEALERS      — 10 placeholder records, awaiting official list
   ============================================================ */

window.DADEX_DEALERS = [

  /* ============================================================
     DISTRIBUTORS — Approved records
     Last updated: 15 October 2026
     ============================================================ */

  {
    name: "Burhani Traders",
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
    province: "Islamabad",
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
    /* NOTE: source shows a second phone truncated as "042-3..."
       — supply the full number and either append it here or add
       as `whatsapp` if that's what it is. */
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
     These will be replaced once the official dealer list is provided.
     Keep active:true so the directory shows a populated grid during
     review; switch to active:false if the directory should be empty
     until real data lands.
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
];
