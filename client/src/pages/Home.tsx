// Nairobi Atelier: this page uses cinematic vehicle imagery, offset rails, navy depth, and Mugo Gold action cues.
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import React from "react";
import { KENYA_CATALOGUE_TEMPLATE_COUNT, KENYA_CATALOGUE_TEMPLATES } from "@shared/kenyaCatalogueTemplates";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  CarFront,
  Check,
  ChevronDown,
  CircleDollarSign,
  Fuel,
  Gauge,
  GitCompareArrows,
  Globe2,
  Heart,
  MapPin,
  Menu,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

const HERO_IMAGE = "/manus-storage/mugo-hero-reference_b5061f16.jpg";
const MARK_IMAGE = "/manus-storage/mugo-mark_fe33e30b.png";

type Vehicle = {
  id: number;
  name: string;
  year: number;
  price: string;
  priceValue: number;
  mileage: string;
  mileageValue: number;
  fuel: string;
  transmission: string;
  location: string;
  tag: string;
  image: string;
  description: string;
  bodyType: string;
  isCatalogue?: boolean;
};

const vehicles: Vehicle[] = [
  {
    id: 1,
    name: "Volvo XC60 B5 Inscription",
    year: 2021,
    price: "KES 7.85M",
    priceValue: 7.85,
    mileage: "32,400 km",
    mileageValue: 32400,
    fuel: "Petrol hybrid",
    transmission: "Automatic",
    location: "Nairobi, Kenya",
    tag: "Fresh arrival",
    image: HERO_IMAGE,
    description: "Scandinavian calm with the confidence of a proper long-distance tourer.",
    bodyType: "SUV",
  },
  {
    id: 2,
    name: "Mercedes-Benz C200 Avantgarde",
    year: 2020,
    price: "KES 6.40M",
    priceValue: 6.4,
    mileage: "41,800 km",
    mileageValue: 41800,
    fuel: "Petrol",
    transmission: "Automatic",
    location: "Mombasa, Kenya",
    tag: "Kenya-ready",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1600&q=85",
    description: "A precise executive sedan with quiet confidence in every line.",
    bodyType: "Sedan",
  },
  {
    id: 3,
    name: "Mazda CX-5 Signature",
    year: 2022,
    price: "KES 5.95M",
    priceValue: 5.95,
    mileage: "24,100 km",
    mileageValue: 24100,
    fuel: "Petrol",
    transmission: "Automatic",
    location: "Nairobi, Kenya",
    tag: "Export ready",
    image: "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1600&q=85",
    description: "A composed, capable crossover for the city-to-coast route.",
    bodyType: "SUV",
  },
  {
    id: 4,
    name: "Volkswagen Golf R-Line",
    year: 2021,
    price: "KES 4.80M",
    priceValue: 4.8,
    mileage: "36,900 km",
    mileageValue: 36900,
    fuel: "Petrol",
    transmission: "Automatic",
    location: "Nairobi, Kenya",
    tag: "Curated pick",
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=85",
    description: "A compact daily with just enough edge to make the long way home appealing.",
    bodyType: "Hatchback",
  },
];

const paymentRails = ["M-Pesa", "Airtel Money", "Visa / Mastercard", "PayPal", "USDT / BTC"];

export default function Home() {
  // The useAuth hook provides authentication state.
  // To implement login/logout, call logout(), or start login from an event
  // handler: onClick={() => startLogin()} (imported from "@/const"). Never call
  // startLogin() during render (no href={startLogin()}) — it mints a one-time
  // nonce cookie and must run only at the moment of navigation.
  const { user, isAuthenticated } = useAuth();

  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All body types");
  const [priceBand, setPriceBand] = useState("Any price");
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inquiryVehicle, setInquiryVehicle] = useState<Vehicle | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showCatalogue, setShowCatalogue] = useState(false);

  const inventoryQueryInput = useMemo(() => ({ query }), [query]);
  const publishedInventory = trpc.marketplace.vehicles.publicList.useQuery(inventoryQueryInput);
  const saveVehicle = trpc.marketplace.buyer.saveVehicle.useMutation();
  const unsaveVehicle = trpc.marketplace.buyer.unsaveVehicle.useMutation();

  const liveVehicles = useMemo<Vehicle[]>(() => {
    if (!publishedInventory.data?.length) return vehicles;
    return publishedInventory.data.map((vehicle) => ({
      id: vehicle.id,
      name: `${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`,
      year: vehicle.year,
      price: new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(vehicle.priceKsh),
      priceValue: vehicle.priceKsh / 1_000_000,
      mileage: vehicle.mileageKm ? `${new Intl.NumberFormat("en-KE").format(vehicle.mileageKm)} km` : "Mileage pending",
      mileageValue: vehicle.mileageKm ?? 0,
      fuel: vehicle.fuelType ?? "Fuel pending",
      transmission: vehicle.transmission ?? "Transmission pending",
      location: vehicle.location ?? "Location pending",
      tag: vehicle.availability === "available" ? "Fresh arrival" : vehicle.availability,
      image: vehicle.media.find((item) => item.isCover)?.url ?? vehicle.media[0]?.url ?? HERO_IMAGE,
      description: vehicle.description ?? vehicle.conditionSummary ?? "A considered arrival with full details available on request.",
      bodyType: vehicle.bodyType ?? "Other",
    }));
  }, [publishedInventory.data]);

  const catalogueVehicles = useMemo<Vehicle[]>(() => KENYA_CATALOGUE_TEMPLATES.map((vehicle, index) => ({
    id: 10_000 + index,
    name: `${vehicle.make} ${vehicle.model}`,
    year: vehicle.year,
    price: "Check availability",
    priceValue: 0,
    mileage: "Inspection pending",
    mileageValue: 0,
    fuel: vehicle.fuelType,
    transmission: vehicle.transmission,
    location: "Kenya sourcing catalogue",
    tag: "Availability pending",
    image: "",
    description: "Catalogue template only. Ask Mugo to check sourcing, condition, VIN, price, and current availability.",
    bodyType: vehicle.bodyType,
    isCatalogue: true,
  })), []);

  const browseVehicles = useMemo(() => showCatalogue ? [...liveVehicles, ...catalogueVehicles] : liveVehicles, [catalogueVehicles, liveVehicles, showCatalogue]);

  const filteredVehicles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return browseVehicles.filter((vehicle) => {
      const matchesQuery = !normalizedQuery || `${vehicle.name} ${vehicle.location} ${vehicle.tag}`.toLowerCase().includes(normalizedQuery);
      const matchesType = selectedType === "All body types" || vehicle.bodyType === selectedType;
      const matchesPrice = vehicle.isCatalogue ? priceBand === "Any price" : priceBand === "Any price" || (priceBand === "Under KES 5M" && vehicle.priceValue < 5) || (priceBand === "KES 5M – 7M" && vehicle.priceValue >= 5 && vehicle.priceValue <= 7) || (priceBand === "Above KES 7M" && vehicle.priceValue > 7);
      return matchesQuery && matchesType && matchesPrice;
    });
  }, [browseVehicles, priceBand, query, selectedType]);

  const compareVehicles = useMemo(() => browseVehicles.filter((vehicle) => compareIds.includes(vehicle.id)), [browseVehicles, compareIds]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const toggleSaved = (id: number) => {
    setSavedIds((current) => current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id]);
    const vehicle = browseVehicles.find((item) => item.id === id);
    if (isAuthenticated && !vehicle?.isCatalogue) {
      if (savedIds.includes(id)) unsaveVehicle.mutate({ vehicleId: id });
      else saveVehicle.mutate({ vehicleId: id });
    }
    notify(savedIds.includes(id) ? "Removed from your saved list." : vehicle?.isCatalogue ? "Saved locally. We will confirm availability before adding it to your garage." : "Saved to your shortlist.");
  };

  const toggleCompare = (vehicle: Vehicle) => {
    if (compareIds.includes(vehicle.id)) {
      setCompareIds((current) => current.filter((id) => id !== vehicle.id));
      notify(`${vehicle.name} removed from comparison.`);
      return;
    }
    if (compareIds.length >= 3) {
      notify("Compare up to three vehicles at a time.");
      return;
    }
    setCompareIds((current) => [...current, vehicle.id]);
    notify(`${vehicle.name} added to comparison.`);
  };

  const scrollToInventory = () => {
    document.getElementById("inventory")?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="site-shell">
      <div className="topline">
        <div className="topline__inner">
          <span><MapPin size={13} /> Nairobi · Mombasa · Worldwide delivery</span>
          <span className="topline__right"><ShieldCheck size={13} /> Payments held with verified partners</span>
        </div>
      </div>

      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="Mugo Automobiles home">
          <img src={MARK_IMAGE} alt="" className="brand-mark" />
          <span className="brand-copy">
            <strong>Mugo Automobiles</strong>
            <small>Motoring nirvana, considered.</small>
          </span>
        </a>
        <nav className={`primary-nav ${mobileMenuOpen ? "primary-nav--open" : ""}`} aria-label="Primary navigation">
          <a href="#inventory" onClick={() => setMobileMenuOpen(false)}>Browse stock</a>
          <a href="#journey" onClick={() => setMobileMenuOpen(false)}>How it works</a>
          <a href="#global" onClick={() => setMobileMenuOpen(false)}>Global delivery</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
        </nav>
        <div className="header-actions">
          {isAuthenticated ? <a className="saved-link" href={user?.role === "admin" ? "/admin" : "/buyer"}>{user?.role === "admin" ? "Operations" : "My garage"}</a> : <button className="saved-link" onClick={() => startLogin()}>Sign in</button>}
          <button className="saved-link" onClick={() => notify(`${savedIds.length} ${savedIds.length === 1 ? "vehicle" : "vehicles"} saved to your shortlist.`)} aria-label="View saved vehicles">
            <Heart size={17} fill={savedIds.length ? "currentColor" : "none"} />
            <span>{savedIds.length || "Save"}</span>
          </button>
          <button className="header-cta" onClick={scrollToInventory}>Find my car <ArrowRight size={16} /></button>
          <button className="menu-toggle" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
          <div className="hero__veil" />
          <div className="hero__grid" />
          <div className="hero__content">
            <p className="eyebrow eyebrow--gold"><Sparkles size={13} /> MUGO AUTOMOBILES / 01</p>
            <h1>The right car<br /><em>changes the route.</em></h1>
            <p className="hero__lede">Curated vehicles, clear pathways, and human guidance from Nairobi to wherever the road takes you.</p>
            <div className="hero__actions">
              <button className="button button--gold" onClick={scrollToInventory}>Explore the arrival list <ArrowRight size={18} /></button>
              <a className="text-link text-link--light" href="#journey">See how we move <ArrowDownRight size={17} /></a>
            </div>
          </div>
          <div className="hero__note">
            <span className="hero__note-label">New arrival / 07</span>
            <strong>Volvo XC60 B5</strong>
            <span>Built for the city. Ready for the long way around.</span>
            <button onClick={() => setInquiryVehicle(vehicles[0])}>View arrival <ArrowRight size={15} /></button>
          </div>
          <div className="hero__footer">
            <span>Curated in Nairobi</span>
            <span>01 — 04</span>
          </div>
        </section>

        <section className="search-dock" aria-label="Search inventory">
          <div className="search-dock__intro">
            <span className="eyebrow">Find your next chapter</span>
            <strong>Search the arrival list</strong>
          </div>
          <label className="search-field">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Make, model, or keyword" aria-label="Search make, model, or keyword" />
          </label>
          <label className="select-field">
            <span>Body type</span>
            <select value={selectedType} onChange={(event) => setSelectedType(event.currentTarget.value)}>
              <option>All body types</option>
              <option>SUV</option>
              <option>Sedan</option>
              <option>Hatchback</option>
            </select>
            <ChevronDown size={15} />
          </label>
          <label className="select-field">
            <span>Price range</span>
            <select value={priceBand} onChange={(event) => setPriceBand(event.currentTarget.value)}>
              <option>Any price</option>
              <option>Under KES 5M</option>
              <option>KES 5M – 7M</option>
              <option>Above KES 7M</option>
            </select>
            <ChevronDown size={15} />
          </label>
          <button className="button button--navy search-button" onClick={scrollToInventory}>Search stock <ArrowRight size={16} /></button>
        </section>

        <section className="section section--inventory" id="inventory">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow eyebrow--gold-dark"><span className="eyebrow-rule" /> The arrival list</p>
              <h2>Cars with a point<br /><em>of view.</em></h2>
            </div>
            <div className="section-heading__side">
              <p>Every listing is selected for condition, story, and the way it will feel when it becomes yours.</p>
              <button className="text-link" onClick={() => setShowCatalogue((visible) => !visible)}>{showCatalogue ? "Show verified arrivals" : `Browse ${KENYA_CATALOGUE_TEMPLATE_COUNT} Kenya models`} <ArrowRight size={16} /></button>
            </div>
          </div>

          <div className="inventory-rail">
            {showCatalogue && <div className="catalogue-disclosure"><ShieldCheck size={18} /><div><strong>Kenya vehicle catalogue</strong><span>These are availability-pending model templates, not verified offers. Confirm stock, condition, VIN, media, and price with Mugo before proceeding.</span></div></div>}
            <div className="inventory-rail__line"><span>{filteredVehicles.length.toString().padStart(2, "0")} {showCatalogue ? "models and arrivals" : "verified arrivals"} shown</span><span><SlidersHorizontal size={15} /> Filters update live · compare up to 3</span></div>
            <div className="vehicle-grid">
              {filteredVehicles.length ? filteredVehicles.map((vehicle, index) => (
                <article className={`vehicle-card ${index === 0 && !vehicle.isCatalogue ? "vehicle-card--lead" : ""} ${vehicle.isCatalogue ? "vehicle-card--catalogue" : ""}`} key={vehicle.id}>
                  <div className="vehicle-card__image-wrap">
                    {vehicle.isCatalogue ? <div className="catalogue-card__media" aria-label={`${vehicle.name} catalogue template`}><CarFront size={42} /><span>Kenya catalogue</span></div> : <img src={vehicle.image} alt={vehicle.name} className="vehicle-card__image" />}
                    <div className="vehicle-card__image-overlay" />
                    <span className="vehicle-card__tag">{vehicle.tag}</span>
                    <button className={`save-button ${savedIds.includes(vehicle.id) ? "save-button--saved" : ""}`} onClick={() => toggleSaved(vehicle.id)} aria-label={`${savedIds.includes(vehicle.id) ? "Remove" : "Save"} ${vehicle.name}`}>
                      <Heart size={17} fill={savedIds.includes(vehicle.id) ? "currentColor" : "none"} />
                    </button>
                    {index === 0 && !vehicle.isCatalogue && <span className="vehicle-card__index">01 / 04</span>}
                  </div>
                  <div className="vehicle-card__body">
                    <div className="vehicle-card__title-row"><div><span className="vehicle-year">{vehicle.year} · {vehicle.location}</span><h3>{vehicle.name}</h3></div><strong className="vehicle-price">{vehicle.price}</strong></div>
                    <p>{vehicle.description}</p>
                    <div className="vehicle-specs"><span><Gauge size={15} /> {vehicle.mileage}</span><span><Fuel size={15} /> {vehicle.fuel}</span><span><BadgeCheck size={15} /> {vehicle.transmission}</span></div>
                    <div className="card-actions"><button className="card-action" onClick={() => setInquiryVehicle(vehicle)}>{vehicle.isCatalogue ? "Check availability" : "Ask about this car"} <ArrowRight size={15} /></button><button className={`compare-toggle ${compareIds.includes(vehicle.id) ? "compare-toggle--active" : ""}`} onClick={() => toggleCompare(vehicle)} aria-pressed={compareIds.includes(vehicle.id)}><GitCompareArrows size={14} /> {compareIds.includes(vehicle.id) ? "Comparing" : "Compare"}</button></div>
                  </div>
                </article>
              )) : <div className="empty-state"><Search size={24} /><strong>No cars match that route.</strong><span>Try a wider search or reset the filters.</span><button className="button button--outline" onClick={() => { setQuery(""); setSelectedType("All body types"); setPriceBand("Any price"); }}>Reset filters</button></div>}
            </div>
          </div>
        </section>

        <section className="section section--dark" id="journey">
          <div className="section-heading section-heading--dark">
            <div><p className="eyebrow eyebrow--gold"><span className="eyebrow-rule eyebrow-rule--light" /> The Mugo route</p><h2>From first look<br /><em>to handover.</em></h2></div>
            <p>Buying a vehicle should feel like a considered decision—not a maze. We keep every step visible and every next move human.</p>
          </div>
          <div className="steps-grid">
            <div className="step-card"><span className="step-card__number">01</span><Search size={20} /><h3>Discover</h3><p>Browse a curated list with the details that matter: condition, mileage, location, and price.</p><a href="#inventory">Start browsing <ArrowRight size={15} /></a></div>
            <div className="step-card"><span className="step-card__number">02</span><Send size={20} /><h3>Align</h3><p>Ask a clear question, request a walkaround, or speak with someone who knows the car.</p><button onClick={() => setInquiryVehicle(vehicles[0])}>Make an enquiry <ArrowRight size={15} /></button></div>
            <div className="step-card"><span className="step-card__number">03</span><CircleDollarSign size={20} /><h3>Move forward</h3><p>Reserve with a verified payment partner and keep your order, paperwork, and delivery route together.</p><a href="#global">See payment rails <ArrowRight size={15} /></a></div>
          </div>
        </section>

        <section className="section global-section" id="global">
          <div className="global-section__copy"><p className="eyebrow eyebrow--gold-dark"><span className="eyebrow-rule" /> Kenya-ready, world-bound</p><h2>Local trust.<br /><em>Longer horizons.</em></h2><p className="global-section__lede">Whether you are in Nairobi, on the coast, or buying from abroad, we make the route to your vehicle visible from the first conversation.</p><div className="global-points"><span><Check size={15} /> Vehicle-first guidance</span><span><Check size={15} /> Clear import pathways</span><span><Check size={15} /> Verified payment partners</span></div></div>
          <div className="global-section__panel"><div className="route-map"><span className="route-map__label route-map__label--nairobi"><MapPin size={13} /> Nairobi</span><span className="route-map__label route-map__label--mombasa"><MapPin size={13} /> Mombasa</span><span className="route-map__label route-map__label--global"><Globe2 size={15} /> Your destination</span><span className="route-map__line route-map__line--one" /><span className="route-map__line route-map__line--two" /><span className="route-map__sun" /></div><div className="payment-row"><span>Reserve with</span>{paymentRails.map((rail) => <strong key={rail}>{rail}</strong>)}</div></div>
        </section>

        <section className="contact-band" id="contact"><div><p className="eyebrow eyebrow--gold">A better starting point</p><h2>Tell us what<br /><em>you are looking for.</em></h2></div><div className="contact-band__action"><p>Share a make, a route, or simply a feeling. We will take it from there.</p><button className="button button--gold" onClick={() => setContactOpen(true)}>Start a conversation <ArrowRight size={18} /></button></div></section>
      </main>

      <footer className="site-footer"><div className="footer-top"><a className="brand-lockup brand-lockup--footer" href="#top"><img src={MARK_IMAGE} alt="" className="brand-mark" /><span className="brand-copy"><strong>Mugo Automobiles</strong><small>Motoring nirvana, considered.</small></span></a><div className="footer-nav"><a href="#inventory">Browse stock</a><a href="#journey">How it works</a><a href="#global">Delivery</a><a href="#contact">Contact</a></div><div className="footer-location"><span>Based in Nairobi</span><strong>+254 700 000 000</strong></div></div><div className="footer-bottom"><span>© 2026 Mugo Automobiles. Clear paths from first look to handover.</span><span>Privacy · Terms · Refund policy</span></div></footer>

      {compareIds.length > 0 && <div className="comparison-tray"><div className="comparison-tray__copy"><GitCompareArrows size={18} /><span><strong>Compare vehicles</strong><small>{compareIds.length} of 3 selected</small></span></div><div className="comparison-tray__items">{compareVehicles.map((vehicle) => <button key={vehicle.id} className="comparison-chip" onClick={() => toggleCompare(vehicle)}><span>{vehicle.name}</span><X size={13} /></button>)}</div><div className="comparison-tray__actions"><button className="comparison-clear" onClick={() => setCompareIds([])}>Clear</button><button className="button button--gold" disabled={compareIds.length < 2} onClick={() => setComparisonOpen(true)}>Compare now <ArrowRight size={16} /></button></div></div>}

      {toast && <div className="toast" role="status"><Check size={16} /> {toast}</div>}

      {comparisonOpen && <div className="modal-backdrop" role="presentation" onClick={() => setComparisonOpen(false)}><div className="comparison-modal" role="dialog" aria-modal="true" aria-labelledby="comparison-title" onClick={(event) => event.stopPropagation()}><div className="comparison-modal__header"><div><span className="eyebrow eyebrow--gold-dark">Your shortlist</span><h2 id="comparison-title">Compare the<br /><em>details.</em></h2><p>Put the useful differences next to each other before you make your next move.</p></div><button className="modal-close" onClick={() => setComparisonOpen(false)} aria-label="Close comparison"><X size={18} /></button></div><div className="compare-table"><div className="compare-table__head compare-table__row"><div className="compare-table__label">Vehicle</div>{compareVehicles.map((vehicle) => <div className="compare-table__vehicle" key={vehicle.id}><img src={vehicle.image} alt="" /><span>{vehicle.tag}</span><strong>{vehicle.name}</strong></div>)}</div>{[["Price", (vehicle: Vehicle) => vehicle.price], ["Year", (vehicle: Vehicle) => vehicle.year], ["Mileage", (vehicle: Vehicle) => vehicle.mileage], ["Fuel", (vehicle: Vehicle) => vehicle.fuel], ["Transmission", (vehicle: Vehicle) => vehicle.transmission], ["Location", (vehicle: Vehicle) => vehicle.location]].map(([label, getValue]) => <div className="compare-table__row" key={label as string}><div className="compare-table__label">{label as string}</div>{compareVehicles.map((vehicle) => <div className="compare-table__cell" key={`${vehicle.id}-${label}`}>{(getValue as (item: Vehicle) => string | number)(vehicle)}</div>)}</div>)}</div><div className="comparison-modal__footer"><span><BadgeCheck size={15} /> Every comparison is based on the current arrival list.</span><div><button className="comparison-clear" onClick={() => { setCompareIds([]); setComparisonOpen(false); }}>Clear shortlist</button><button className="button button--navy" onClick={() => { setInquiryVehicle(compareVehicles[0]); setComparisonOpen(false); }}>Ask about a vehicle <ArrowRight size={16} /></button></div></div></div></div>}

      {(inquiryVehicle || contactOpen) && <div className="modal-backdrop" role="presentation" onClick={() => { setInquiryVehicle(null); setContactOpen(false); }}><div className="inquiry-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => { setInquiryVehicle(null); setContactOpen(false); }} aria-label="Close enquiry"><X size={18} /></button><span className="eyebrow eyebrow--gold-dark">{inquiryVehicle ? "Your next move" : "A considered start"}</span><h2 id="inquiry-title">{inquiryVehicle ? <>Ask about<br /><em>{inquiryVehicle.name}</em></> : <>Tell us what<br /><em>you are looking for.</em></>}</h2><p className="inquiry-modal__intro">Tell us how you would like to continue and a Mugo guide will come back with the useful details.</p>{inquiryVehicle && <div className="inquiry-modal__vehicle"><img src={inquiryVehicle.image} alt="" /><div><strong>{inquiryVehicle.price}</strong><span>{inquiryVehicle.year} · {inquiryVehicle.mileage} · {inquiryVehicle.location}</span></div></div>}<label className="form-field"><span>Your name</span><input placeholder="How should we address you?" /></label><label className="form-field"><span>What would you like to know?</span><textarea placeholder="Availability, a make, a route, or anything else." rows={3} /></label><button className="button button--navy button--full" onClick={() => { setInquiryVehicle(null); setContactOpen(false); notify("Your enquiry is ready for a Mugo guide."); }}>Send enquiry <ArrowRight size={17} /></button><small className="form-note">No pressure. No noisy follow-ups. Just the next useful detail.</small></div></div>}
    </div>
  );
}
