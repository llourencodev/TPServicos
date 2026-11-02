import React, {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import categoryCommunityEditorial from "./assets/category-community-editorial.png";
import categoryServicesEditorial from "./assets/category-services-editorial.png";
import "./style.css";

const API =
  (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env
    .VITE_API_URL ?? "/api";
type Role = "CUSTOMER" | "PROVIDER" | "ADMIN";
type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified?: boolean;
};
type Session = { accessToken: string; user: User };
type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};
type PopularCategory = Category & { requestCount: number };
type AdvertisingPlan = {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  amountInCents: number;
  active?: boolean;
};
type SponsoredAd = {
  id: string;
  companyName: string;
  description: string;
  city: string;
  category: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  endsAt: string | null;
  package: { name: string };
};
type RequestItem = {
  id: string;
  title: string;
  description: string;
  city: string;
  neighborhood: string;
  status: string;
  leadCreditCost: number;
  maxUnlocks?: number;
  unlockedCount?: number;
  createdAt: string;
  category: { id: string; name: string };
  unlocks?: {
    id: string;
    providerId: string;
    provider: { id: string; name: string };
  }[];
  rating?: { score: number; comment: string | null; providerId: string } | null;
  acceptedProvider?: { id: string; name: string } | null;
  statusHistory?: {
    id: string;
    previousStatus: string | null;
    status: string;
    createdAt: string;
    actor: { name: string } | null;
  }[];
};
type Provider = {
  id: string;
  bio: string;
  city: string;
  availability?: string;
  priceFromCents?: number | null;
  serviceRadiusKm?: number;
  latitude?: number | null;
  longitude?: number | null;
  portfolioUrls?: string[];
  avatarUrl?: string | null;
  verifiedAt: string | null;
  averageScore: number | null;
  ratingCount?: number;
  user: { id: string; name: string };
  categories: { category: { id: string; name: string } }[];
};
type PublicProvider = Provider & {
  userId: string;
  serviceAreas: string[];
  portfolioUrls: string[];
  createdAt: string;
  reviews: {
    id: string;
    score: number;
    comment: string | null;
    createdAt: string;
    author: { name: string };
  }[];
};
type ProviderSearchPage = {
  items: Provider[];
  total: number;
  pageSize: number;
  hasNextPage: boolean;
  nextCursor: string | null;
};
type HomeHighlights = {
  recommended: Provider[];
  topRated: Provider[];
  popularCategories: PopularCategory[];
};
type ProviderFilters = {
  query: string;
  city: string;
  categoryId: string;
  maxPrice: string;
  verifiedOnly: boolean;
};
const emptyProviderFilters: ProviderFilters = {
  query: "",
  city: "",
  categoryId: "",
  maxPrice: "",
  verifiedOnly: false,
};
function providerFiltersFromLocation(): ProviderFilters {
  const params = new URLSearchParams(window.location.search);
  return {
    ...emptyProviderFilters,
    categoryId: params.get("categoryId") ?? "",
  };
}
type Contact = {
  unlockId: string;
  requestId: string;
  title: string;
  neighborhood: string;
  customer: { id: string; name: string; email: string; phone: string | null };
  category: string;
};
type Proposal = {
  id: string;
  summary: string;
  priceCents: number | null;
  scheduledFor: string | null;
  status: "SENT" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";
  createdAt: string;
  updatedAt: string;
  provider: { id: string; name: string };
};
type DirectMessage = {
  id: string;
  body: string;
  attachmentUrls: string[];
  readAt: string | null;
  createdAt: string;
  sender: { id: string; name: string };
  recipient: { id: string; name: string };
};
type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};
type ApiCall = <T>(path: string, init?: RequestInit) => Promise<T>;
type PublicPage =
  | "home"
  | "professionals"
  | "categories"
  | "services"
  | "ratings"
  | "how"
  | "advertising"
  | "terms"
  | "privacy"
  | "profile";

const publicPaths: Record<PublicPage, string> = {
  home: "/",
  professionals: "/profissionais",
  categories: "/categorias",
  services: "/servicos",
  ratings: "/avaliacoes",
  how: "/como-funciona",
  advertising: "/anuncie",
  terms: "/termos",
  privacy: "/privacidade",
  profile: "/profissional",
};

type AdminSection =
  | "overview"
  | "activity"
  | "purchases"
  | "refunds"
  | "verifications"
  | "reports"
  | "users"
  | "categories"
  | "packages"
  | "advertising";

const adminPaths: Record<AdminSection, string> = {
  overview: "/admin/visao-geral",
  activity: "/admin/atividade",
  purchases: "/admin/compras",
  refunds: "/admin/estornos",
  verifications: "/admin/verificacoes",
  reports: "/admin/denuncias",
  users: "/admin/usuarios",
  categories: "/admin/categorias",
  packages: "/admin/pacotes",
  advertising: "/admin/publicidade",
};

const categoryVisuals = [
  { image: categoryCommunityEditorial, position: "0% 0%" },
  { image: categoryServicesEditorial, position: "100% 0%" },
  { image: categoryCommunityEditorial, position: "100% 0%" },
  { image: categoryServicesEditorial, position: "0% 100%" },
  { image: categoryServicesEditorial, position: "100% 100%" },
  { image: categoryServicesEditorial, position: "0% 0%" },
  { image: categoryCommunityEditorial, position: "0% 100%" },
  { image: categoryCommunityEditorial, position: "100% 100%" },
];

function publicPageFromPath(pathname: string): PublicPage {
  if (providerIdFromPath(pathname)) return "profile";
  return (
    (Object.entries(publicPaths).find(([, path]) => path === pathname)?.[0] as
      PublicPage | undefined) ?? "home"
  );
}

function adminSectionFromPath(pathname: string): AdminSection {
  return (
    (Object.entries(adminPaths).find(([, path]) => path === pathname)?.[0] as
      AdminSection | undefined) ?? "overview"
  );
}

function providerIdFromPath(pathname: string) {
  const match = /^\/profissional\/([^/]+)$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

const tresPontasCenter: [number, number] = [-21.3686, -45.5123];
let leafletLoader: Promise<any> | null = null;

function loadLeaflet() {
  if (typeof window === "undefined")
    return Promise.reject(new Error("Sem mapa"));
  const windowWithLeaflet = window as typeof window & { L?: any };
  if (windowWithLeaflet.L) return Promise.resolve(windowWithLeaflet.L);
  if (!leafletLoader) {
    leafletLoader = new Promise((resolve, reject) => {
      if (!document.getElementById("leaflet-styles")) {
        const stylesheet = document.createElement("link");
        stylesheet.id = "leaflet-styles";
        stylesheet.rel = "stylesheet";
        stylesheet.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.append(stylesheet);
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () =>
        windowWithLeaflet.L
          ? resolve(windowWithLeaflet.L)
          : reject(new Error("Mapa indisponível"));
      script.onerror = () => reject(new Error("Mapa indisponível"));
      document.head.append(script);
    });
  }
  return leafletLoader;
}

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function approximateProviderLocation(provider: Provider, index: number) {
  if (
    provider.latitude !== null &&
    provider.latitude !== undefined &&
    provider.longitude !== null &&
    provider.longitude !== undefined
  ) {
    return [provider.latitude, provider.longitude] as [number, number];
  }
  const seed = [...provider.id].reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );
  const angle = ((seed % 360) * Math.PI) / 180;
  const radius = 0.0024 + (index % 3) * 0.001;
  return [
    tresPontasCenter[0] + Math.sin(angle) * radius,
    tresPontasCenter[1] + Math.cos(angle) * radius,
  ] as [number, number];
}

function LocalProviderMap({
  providers,
  onProviderSelect,
}: {
  providers: Provider[];
  onProviderSelect: (provider: Provider) => void;
}) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const leaflet = useRef<any>(null);
  const markerLayer = useRef<any>(null);
  const map = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const localProviders = providers.filter((provider) =>
    normalizedText(provider.city).includes("tres pontas"),
  );

  useEffect(() => {
    let disposed = false;
    void loadLeaflet()
      .then((Leaflet) => {
        if (disposed || !mapElement.current) return;
        const instance = Leaflet.map(mapElement.current, {
          attributionControl: true,
          zoomControl: false,
        }).setView(tresPontasCenter, 13);
        Leaflet.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
          },
        ).addTo(instance);
        Leaflet.control.zoom({ position: "bottomright" }).addTo(instance);
        Leaflet.circleMarker(tresPontasCenter, {
          color: "#0d5d86",
          fillColor: "#f7dc45",
          fillOpacity: 1,
          radius: 7,
          weight: 3,
        })
          .addTo(instance)
          .bindTooltip("Centro de Três Pontas", {
            direction: "top",
            offset: [0, -8],
            className: "tp-map-city-tooltip",
          });
        map.current = instance;
        leaflet.current = Leaflet;
        markerLayer.current = Leaflet.layerGroup().addTo(instance);
        setMapReady(true);
      })
      .catch(() => {
        if (!disposed) setMapUnavailable(true);
      });

    return () => {
      disposed = true;
      markerLayer.current = null;
      leaflet.current = null;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !leaflet.current || !markerLayer.current) return;
    const Leaflet = leaflet.current;
    const layer = markerLayer.current;
    layer.clearLayers();
    localProviders.forEach((provider, index) => {
      const marker = Leaflet.marker(
        approximateProviderLocation(provider, index),
        {
          icon: Leaflet.divIcon({
            className: "tp-map-marker-shell",
            html: '<span aria-hidden="true">✦</span>',
            iconSize: [38, 38],
            iconAnchor: [19, 34],
            tooltipAnchor: [0, -30],
          }),
        },
      ).addTo(layer);
      const providerName = document.createElement("span");
      providerName.textContent = provider.user.name;
      marker.bindTooltip(providerName, {
        permanent: true,
        direction: "top",
        offset: [0, -28],
        className: "tp-map-provider-tooltip",
        opacity: 1,
      });
      marker.on("click", () => onProviderSelect(provider));
    });
  }, [localProviders, mapReady, onProviderSelect]);

  const providerCountLabel = `${localProviders.length} ${
    localProviders.length === 1 ? "profissional" : "profissionais"
  } no mapa`;

  return (
    <div className="local-provider-map">
      {mapUnavailable ? (
        <iframe
          className="local-provider-map-fallback"
          title="Mapa de Três Pontas, Minas Gerais"
          src="https://www.openstreetmap.org/export/embed.html?bbox=-45.548%2C-21.389%2C-45.477%2C-21.346&amp;layer=mapnik&amp;marker=-21.3686%2C-45.5123"
        />
      ) : (
        <div
          ref={mapElement}
          className="local-provider-map-canvas"
          aria-label="Mapa navegável de Três Pontas com profissionais cadastrados"
        />
      )}
      <div className="local-map-title" aria-live="polite">
        <span aria-hidden="true">⌖</span>
        <div>
          <strong>Três Pontas, MG</strong>
          <small>
            {mapReady ? providerCountLabel : "Carregando mapa local…"}
          </small>
        </div>
      </div>
      <p className="local-map-note">
        Arraste, aproxime e toque em um marcador. A posição representa a região
        cadastrada; o endereço exato não é exibido.
      </p>
      {mapUnavailable && localProviders.length > 0 && (
        <div className="local-map-fallback-providers">
          <span>Profissionais cadastrados</span>
          <div>
            {localProviders.slice(0, 3).map((provider) => (
              <button
                type="button"
                key={provider.id}
                onClick={() => onProviderSelect(provider)}
              >
                {provider.user.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LegalPage({ page }: { page: "terms" | "privacy" }) {
  const privacy = page === "privacy";
  return (
    <main className="legal-page">
      <span className="eyebrow">TPServiços · transparência</span>
      <h1>{privacy ? "Política de Privacidade" : "Termos de Uso"}</h1>
      <p className="legal-lead">
        {privacy
          ? "Explicamos de forma direta quais dados são usados para viabilizar conexões confiáveis entre clientes e profissionais."
          : "Estas regras ajudam clientes, profissionais e a equipe TPServiços a manter relações comerciais seguras e respeitosas."}
      </p>
      <div className="legal-grid">
        {privacy ? (
          <>
            <section>
              <h2>Dados necessários</h2>
              <p>
                Usamos nome, contato, perfil profissional, pedidos e mensagens
                apenas para operar a contratação, prevenir fraudes e atender
                obrigações legais.
              </p>
            </section>
            <section>
              <h2>Compartilhamento controlado</h2>
              <p>
                O contato do cliente só fica disponível ao profissional que
                desbloqueou o pedido. O mapa exibe somente região aproximada,
                nunca endereço residencial.
              </p>
            </section>
            <section>
              <h2>Seus controles</h2>
              <p>
                Você pode corrigir informações do perfil, solicitar suporte e
                denunciar conteúdo ou comportamento inadequado pelo painel.
              </p>
            </section>
          </>
        ) : (
          <>
            <section>
              <h2>Uso responsável</h2>
              <p>
                Perfis, pedidos, propostas e mensagens devem ser verdadeiros,
                respeitosos e relacionados à contratação de serviços.
              </p>
            </section>
            <section>
              <h2>Relação comercial</h2>
              <p>
                O TPServiços facilita a conexão. Cliente e profissional alinham
                escopo, valores, prazos e execução diretamente, com registro de
                proposta na plataforma.
              </p>
            </section>
            <section>
              <h2>Segurança e moderação</h2>
              <p>
                Denúncias e verificações passam por análise. Contas que violam
                estas regras podem perder acesso à plataforma.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function PublicProviderPage({
  api,
  providerId,
  onRegister,
}: {
  api: ApiCall;
  providerId: string;
  onRegister: (role: "CUSTOMER" | "PROVIDER") => void;
}) {
  const [provider, setProvider] = useState<PublicProvider | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setProvider(null);
    setError("");
    void api<PublicProvider>(`/providers/${providerId}`)
      .then((profile) => {
        if (!active) return;
        setProvider(profile);
        document.title = `${profile.user.name} | TPServiços`;
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Perfil indisponível no momento.",
          );
      });
    return () => {
      active = false;
      document.title = "TPServiços | Profissionais da sua cidade";
    };
  }, [api, providerId]);

  async function shareProfile() {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_400);
    } catch {
      setCopied(false);
    }
  }

  if (error)
    return (
      <main className="provider-public-page provider-public-state">
        <span className="eyebrow">Perfil público</span>
        <h1>Este profissional não está disponível.</h1>
        <p>{error}</p>
        <a className="button button-dark" href={publicPaths.professionals}>
          Ver profissionais
        </a>
      </main>
    );
  if (!provider)
    return (
      <main className="provider-public-page provider-public-state">
        <span className="eyebrow">Perfil público</span>
        <h1>Preparando o perfil profissional…</h1>
        <div className="provider-public-skeleton" />
      </main>
    );

  const categoryNames = provider.categories
    .map((item) => item.category.name)
    .join(" · ");
  return (
    <main className="provider-public-page">
      <section className="provider-public-hero">
        <div className="provider-public-image">
          {provider.avatarUrl ? (
            <img
              src={provider.avatarUrl}
              alt={`Foto de ${provider.user.name}`}
            />
          ) : (
            <span>{provider.user.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="provider-public-copy">
          <div className="provider-public-kicker-row">
            <span className="eyebrow">Profissional da sua cidade</span>
            {provider.verifiedAt && (
              <span className="verified">✓ Verificado</span>
            )}
          </div>
          <h1>{provider.user.name}</h1>
          <p className="provider-public-category">{categoryNames}</p>
          <p className="provider-public-bio">
            {provider.bio || "Profissional pronto para ajudar na sua região."}
          </p>
          <dl className="provider-public-facts">
            <div>
              <dt>Atende em</dt>
              <dd>{provider.city}</dd>
            </div>
            <div>
              <dt>Disponibilidade</dt>
              <dd>{provider.availability || "Consulte o profissional"}</dd>
            </div>
            <div>
              <dt>Valor inicial</dt>
              <dd>
                {provider.priceFromCents
                  ? money(provider.priceFromCents)
                  : "Sob consulta"}
              </dd>
            </div>
          </dl>
          <div className="provider-public-actions">
            <button
              className="button button-dark"
              onClick={() => onRegister("CUSTOMER")}
            >
              Pedir orçamento <span>→</span>
            </button>
            <button
              className="button button-quiet"
              onClick={() => void shareProfile()}
            >
              {copied ? "Link copiado" : "Compartilhar perfil"}
            </button>
          </div>
        </div>
        <aside className="provider-public-reputation">
          <span>Reputação</span>
          <strong>
            {provider.averageScore
              ? `★ ${provider.averageScore.toFixed(1)}`
              : "Novo"}
          </strong>
          <small>
            {provider.ratingCount
              ? `${provider.ratingCount} ${provider.ratingCount === 1 ? "avaliação verificada" : "avaliações verificadas"}`
              : "Ainda sem avaliações"}
          </small>
        </aside>
      </section>

      <section className="provider-public-details">
        <div>
          <span className="eyebrow">Área de atendimento</span>
          <h2>Perto de você, sem expor endereço.</h2>
          <p>
            Atendimento em {provider.city}
            {provider.serviceAreas.length
              ? ` e também em ${provider.serviceAreas.join(", ")}`
              : ""}
            . O raio informado é de até {provider.serviceRadiusKm ?? 15} km.
          </p>
        </div>
        <div className="provider-public-tags" aria-label="Especialidades">
          {provider.categories.map((item) => (
            <span key={item.category.id}>{item.category.name}</span>
          ))}
        </div>
      </section>

      {provider.portfolioUrls.length > 0 && (
        <section className="provider-public-portfolio">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Portfólio</span>
              <h2>Trabalhos e referências.</h2>
            </div>
          </div>
          <div>
            {provider.portfolioUrls.map((url) => (
              <img
                key={url}
                src={url}
                alt={`Portfólio de ${provider.user.name}`}
              />
            ))}
          </div>
        </section>
      )}

      <section className="provider-public-reviews">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Avaliações verificadas</span>
            <h2>O que clientes contam.</h2>
          </div>
        </div>
        {provider.reviews.length ? (
          <div className="provider-review-grid">
            {provider.reviews.map((review) => (
              <article key={review.id}>
                <strong>★ {review.score.toFixed(1)}</strong>
                <p>
                  {review.comment ||
                    "Avaliação registrada após serviço concluído."}
                </p>
                <small>
                  {review.author.name.split(" ")[0]} · {date(review.createdAt)}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <p className="provider-public-empty">
            As avaliações serão exibidas aqui após serviços concluídos pela
            plataforma.
          </p>
        )}
      </section>
    </main>
  );
}

let refreshInFlight: Promise<Session | null> | null = null;

function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) =>
        response.ok ? ((await response.json()) as Session) : null,
      )
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      Array.isArray(result.message)
        ? result.message.join(", ")
        : result.message || "Não foi possível concluir a operação.",
    );
  return result as T;
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}
function whatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length <= 11 ? `55${digits}` : digits;
}
function requestStatusLabel(status: string) {
  return (
    {
      OPEN: "Pedido publicado",
      IN_PROGRESS: "Serviço em andamento",
      COMPLETED: "Serviço concluído",
      CANCELLED: "Pedido cancelado",
    }[status] ?? status
  );
}
function Header({
  user,
  api,
  publicMode = false,
  onNavigate,
  onLogin,
  onRegister,
  onLogout,
}: {
  user?: User;
  api?: ApiCall;
  publicMode?: boolean;
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
  onRegister: (role: "CUSTOMER" | "PROVIDER") => void;
  onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="site-header">
      <button
        className="brand"
        onClick={() => onNavigate("home")}
        aria-label="Página inicial TPServiços"
      >
        <span className="brand-mark">TP</span>
        <span className="brand-copy">
          <strong>
            TP<span className="brand-accent">Serviços</span>
          </strong>
          <small>PROFISSIONAIS DA SUA CIDADE</small>
        </span>
      </button>
      {!user || publicMode ? (
        <>
          <button
            className="mobile-nav-trigger"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Fechar" : "Menu"}
            <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
          </button>
          <nav
            className={`primary-navigation ${menuOpen ? "is-open" : ""}`}
            id="primary-navigation"
            aria-label="Navegação principal"
          >
            {(
              [
                ["home", "Início"],
                ["professionals", "Profissionais"],
                ["categories", "Categorias"],
                ["services", "Serviços"],
                ["ratings", "Avaliações"],
                ["how", "Como funciona"],
              ] as const
            ).map(([page, label]) => (
              <a href={publicPaths[page]} key={page}>
                {label}
              </a>
            ))}
          </nav>
        </>
      ) : user.role === "ADMIN" ? (
        <nav aria-label="Navegação da administração">
          <a href={adminPaths.overview}>Visão geral</a>
          <a href={adminPaths.activity}>Atividade</a>
          <a href={adminPaths.purchases}>Compras</a>
          <a href={adminPaths.refunds}>Estornos</a>
          <a href={adminPaths.verifications}>Verificações</a>
          <a href={adminPaths.reports}>Denúncias</a>
          <a href={adminPaths.users}>Usuários</a>
          <a href={adminPaths.categories}>Categorias</a>
          <a href={adminPaths.packages}>Pacotes</a>
          <a href={adminPaths.advertising}>Publicidade</a>
        </nav>
      ) : null}
      <div className="header-actions">
        {(!user || user.role !== "ADMIN" || publicMode) && (
          <a
            className="button button-yellow header-ad-cta"
            href={publicPaths.advertising}
          >
            Anuncie <span aria-hidden="true">↗</span>
          </a>
        )}
        {user ? (
          <>
            {api && <NotificationCenter api={api} />}
            <span className="user-chip">Olá, {user.name.split(" ")[0]}</span>
            <button className="button button-quiet" onClick={onLogout}>
              Sair
            </button>
          </>
        ) : (
          <>
            <button className="button button-quiet" onClick={onLogin}>
              Entrar
            </button>
            <button
              className="button button-dark"
              onClick={() => onRegister("PROVIDER")}
            >
              Seja profissional
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function NotificationCenter({ api }: { api: ApiCall }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const result = await api<{ items: AppNotification[]; unread: number }>(
        "/notifications",
      );
      setItems(result.items);
      setUnread(result.unread);
    } catch {
      /* The core workspace remains usable if notifications are unavailable. */
    }
  }, [api]);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(poll);
  }, [load]);

  async function readAll() {
    await api("/notifications/read-all", { method: "POST" });
    await load();
  }

  return (
    <div className="notification-center">
      <button
        type="button"
        className="notification-trigger"
        aria-label="Abrir notificações"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">⌁</span>
        {unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}
      </button>
      {open && (
        <section className="notification-popover" aria-label="Notificações">
          <div>
            <strong>Atualizações</strong>
            {unread > 0 && (
              <button type="button" onClick={() => void readAll()}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          {items.length ? (
            <ol>
              {items.map((item) => (
                <li className={item.readAt ? "" : "unread"} key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                  <time dateTime={item.createdAt}>{date(item.createdAt)}</time>
                </li>
              ))}
            </ol>
          ) : (
            <p>Nenhuma atualização por enquanto.</p>
          )}
        </section>
      )}
    </div>
  );
}

function EmailVerificationNotice({ api }: { api: ApiCall }) {
  const [state, setState] = useState<
    "idle" | "sending" | "sent" | "unavailable"
  >("idle");
  async function send() {
    setState("sending");
    try {
      const result = await api<{ deliveryConfigured: boolean }>(
        "/auth/email-verification/request",
        { method: "POST" },
      );
      setState(result.deliveryConfigured ? "sent" : "unavailable");
    } catch {
      setState("idle");
    }
  }
  return (
    <div className="account-trust-banner" role="status">
      <span aria-hidden="true">✦</span>
      <p>
        <strong>Confirme seu e-mail para proteger sua conta.</strong>
        {state === "sent"
          ? " Enviamos um link temporário para sua caixa de entrada."
          : state === "unavailable"
            ? " O envio de e-mails ainda precisa ser configurado pela administração."
            : " Isso reforça a recuperação de senha e a segurança das contratações."}
      </p>
      {state !== "sent" && state !== "unavailable" && (
        <button
          type="button"
          onClick={() => void send()}
          disabled={state === "sending"}
        >
          {state === "sending" ? "Enviando…" : "Enviar confirmação"}
        </button>
      )}
    </div>
  );
}

function Home({
  page: publicPage,
  profileId,
  categories,
  api,
  onRegister,
  onNavigate,
}: {
  page: PublicPage;
  profileId: string | null;
  categories: Category[];
  api: ApiCall;
  onRegister: (role: "CUSTOMER" | "PROVIDER") => void;
  onNavigate: (page: PublicPage) => void;
}) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [categoryId, setCategoryId] = useState(
    () => providerFiltersFromLocation().categoryId,
  );
  const [results, setResults] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const [maxPrice, setMaxPrice] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ProviderFilters>(
    providerFiltersFromLocation,
  );
  const searchGeneration = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [highlights, setHighlights] = useState<HomeHighlights | null>(null);
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );
  const loadProviders = useCallback(
    async (
      filters: ProviderFilters = emptyProviderFilters,
      cursor: string | null = null,
      selectedPage = 1,
    ) => {
      const generation = ++searchGeneration.current;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          pageSize: "12",
          ...(filters.query.trim() ? { query: filters.query.trim() } : {}),
          ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
          ...(filters.city.trim() ? { city: filters.city.trim() } : {}),
          ...(filters.maxPrice.trim() && Number(filters.maxPrice) >= 0
            ? {
                maxPriceFromCents: String(
                  Math.round(Number(filters.maxPrice) * 100),
                ),
              }
            : {}),
          ...(filters.verifiedOnly ? { verified: "true" } : {}),
          ...(cursor ? { cursor } : {}),
        });
        const response = await api<ProviderSearchPage>(
          `/providers/search?${params}`,
        );
        if (generation !== searchGeneration.current) return;
        setResults(response.items);
        setTotal(response.total);
        setCurrentCursor(cursor);
        setNextCursor(response.nextCursor);
        setHasNextPage(response.hasNextPage);
        setPage(selectedPage);
      } catch (e) {
        if (generation === searchGeneration.current)
          setError(e instanceof Error ? e.message : "Busca indisponível");
      } finally {
        if (generation === searchGeneration.current) setLoading(false);
      }
    },
    [api],
  );
  useEffect(() => {
    const initialFilters = providerFiltersFromLocation();
    setCategoryId(initialFilters.categoryId);
    setActiveFilters(initialFilters);
    void loadProviders(initialFilters);
  }, [loadProviders]);
  useEffect(() => {
    let active = true;
    void Promise.all([
      api<Omit<HomeHighlights, "popularCategories">>("/providers/highlights"),
      api<PopularCategory[]>("/categories/highlights"),
    ])
      .then(([providerHighlights, popularCategories]) => {
        if (active) setHighlights({ ...providerHighlights, popularCategories });
      })
      .catch(() => {
        if (active) setHighlights(null);
      })
      .finally(() => {
        if (active) setHighlightsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api]);
  function search(event: FormEvent) {
    event.preventDefault();
    const filters = { query, city, categoryId, maxPrice, verifiedOnly };
    setActiveFilters(filters);
    setCursorHistory([]);
    void loadProviders(filters);
    onNavigate("professionals");
  }
  function nextPage() {
    if (!nextCursor || loading) return;
    setCursorHistory((history) => [...history, currentCursor]);
    void loadProviders(activeFilters, nextCursor, page + 1);
  }
  function previousPage() {
    if (page <= 1 || loading) return;
    const previousCursor = cursorHistory.at(-1) ?? null;
    setCursorHistory((history) => history.slice(0, -1));
    void loadProviders(activeFilters, previousCursor, page - 1);
  }
  function chooseCategory(category: Pick<Category, "id">) {
    window.location.assign(
      `${publicPaths.professionals}?categoryId=${encodeURIComponent(category.id)}`,
    );
  }
  const hasActiveFilters = Boolean(
    activeFilters.query ||
    activeFilters.city ||
    activeFilters.categoryId ||
    activeFilters.maxPrice ||
    activeFilters.verifiedOnly,
  );
  return (
    <>
      {(publicPage === "terms" || publicPage === "privacy") && (
        <LegalPage page={publicPage} />
      )}
      {publicPage === "profile" && profileId && (
        <PublicProviderPage
          api={api}
          providerId={profileId}
          onRegister={onRegister}
        />
      )}
      {publicPage === "home" && (
        <>
          <section className="tp-home-hero" id="inicio">
            <div className="tp-hero-copy">
              <span className="tp-kicker">
                <i /> A sua rede local de serviços
              </span>
              <h1>
                Para tudo que importa,<span> alguém por perto.</span>
              </h1>
              <p className="tp-hero-description">
                Encontre profissionais e empresas da sua cidade em um lugar
                feito para conexões simples, diretas e confiáveis.
              </p>
              <form className="tp-search-panel" onSubmit={search}>
                <div className="tp-search-label">
                  O que você precisa resolver?
                </div>
                <label className="directory-query-field">
                  <span aria-hidden="true">⌕</span>
                  <input
                    aria-label="Buscar por nome, serviço ou descrição"
                    maxLength={120}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex.: eletricista, aulas, reforma…"
                  />
                </label>
                <label className="directory-select-field">
                  <select
                    aria-label="Filtrar por categoria"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Todas as categorias</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="directory-city-field">
                  <span aria-hidden="true">⌖</span>
                  <input
                    aria-label="Filtrar por cidade"
                    maxLength={100}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Todas as cidades"
                  />
                </label>
                <button
                  className="button button-dark"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Buscando…" : "Encontrar"}
                </button>
              </form>
              <div className="tp-hero-footnote">
                <span className="tp-hero-dot" />
                {loading
                  ? "Atualizando oportunidades da sua região"
                  : `${total} ${total === 1 ? "perfil disponível" : "perfis disponíveis"} para conhecer`}
              </div>
            </div>
            <aside
              className="tp-hero-visual tp-map-visual"
              aria-label="Mapa de profissionais em Três Pontas"
            >
              <LocalProviderMap
                providers={results}
                onProviderSelect={setSelectedProvider}
              />
            </aside>
          </section>
        </>
      )}
      {publicPage === "professionals" && (
        <>
          <section className="public-page-hero public-directory-hero">
            <div className="route-hero-photo" aria-hidden="true">
              <img src={categoryServicesEditorial} alt="" />
            </div>
            <span className="eyebrow">Diretório TPServiços</span>
            <h1>Profissionais para o que importa hoje.</h1>
            <p>
              Pesquise por serviço, especialidade ou cidade e conheça quem
              atende na sua região.
            </p>
            <form className="directory-page-search" onSubmit={search}>
              <label className="directory-query-field">
                <span aria-hidden="true">⌕</span>
                <input
                  aria-label="Buscar por nome, serviço ou descrição"
                  maxLength={120}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex.: eletricista, aulas, reforma…"
                />
              </label>
              <label className="directory-select-field">
                <select
                  aria-label="Filtrar por categoria"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Todas as categorias</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="directory-city-field">
                <span aria-hidden="true">⌖</span>
                <input
                  aria-label="Filtrar por cidade"
                  maxLength={100}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Todas as cidades"
                />
              </label>
              <button
                className="button button-dark"
                type="submit"
                disabled={loading}
              >
                {loading ? "Buscando…" : "Encontrar"}
              </button>
            </form>
            <div
              className="directory-refinements"
              aria-label="Filtros adicionais"
            >
              <label>
                <span>Até R$</span>
                <input
                  aria-label="Preço inicial máximo"
                  inputMode="decimal"
                  min="0"
                  type="number"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="Qualquer valor"
                />
              </label>
              <label className="directory-check">
                <input
                  checked={verifiedOnly}
                  type="checkbox"
                  onChange={(event) => setVerifiedOnly(event.target.checked)}
                />
                <span>Somente perfis verificados</span>
              </label>
              {(maxPrice || verifiedOnly) && (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setMaxPrice("");
                    setVerifiedOnly(false);
                  }}
                >
                  Limpar refinamentos
                </button>
              )}
            </div>
          </section>
          <section
            className="results-section directory-results tp-discovery"
            id="busca"
            aria-busy={loading}
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">Diretório de profissionais</span>
                <h2>
                  {loading
                    ? "Buscando profissionais…"
                    : total
                      ? hasActiveFilters
                        ? `${total} ${total === 1 ? "perfil encontrado" : "perfis encontrados"}`
                        : `${total} ${total === 1 ? "perfil ativo" : "perfis ativos"} para explorar`
                      : "Encontre o profissional certo"}
                </h2>
              </div>
            </div>
            {error && <p className="alert alert-error">{error}</p>}
            {loading ? (
              <p className="directory-empty">Atualizando o diretório local…</p>
            ) : results.length ? (
              <>
                <div className="provider-grid directory-grid">
                  {results.map((provider) => (
                    <ProviderCard key={provider.id} provider={provider} />
                  ))}
                </div>
                {(page > 1 || hasNextPage) && (
                  <nav
                    className="directory-pagination"
                    aria-label="Paginação de profissionais"
                  >
                    <button
                      className="button button-quiet"
                      type="button"
                      disabled={page === 1 || loading}
                      onClick={previousPage}
                    >
                      Anterior
                    </button>
                    <span>
                      Página {page} · mostrando {(page - 1) * 12 + 1}–
                      {Math.min((page - 1) * 12 + results.length, total)} de{" "}
                      {total}
                    </span>
                    <button
                      className="button button-quiet"
                      type="button"
                      disabled={!hasNextPage || loading}
                      onClick={nextPage}
                    >
                      Próxima
                    </button>
                  </nav>
                )}
              </>
            ) : (
              !error && (
                <div className="directory-empty">
                  <span className="directory-empty-icon">⌕</span>
                  <strong>
                    {hasActiveFilters
                      ? "Nenhum perfil corresponde à sua busca"
                      : "Ainda não há profissionais cadastrados"}
                  </strong>
                  <p>
                    {activeFilters.query ||
                    activeFilters.city ||
                    activeFilters.categoryId
                      ? "Ajuste os filtros e tente novamente."
                      : "Se você presta serviços na região, crie seu perfil para aparecer neste diretório."}
                  </p>
                  {!hasActiveFilters && (
                    <button
                      className="button button-dark"
                      onClick={() => onRegister("PROVIDER")}
                    >
                      Cadastrar meu perfil
                    </button>
                  )}
                </div>
              )
            )}
          </section>
        </>
      )}
      {publicPage === "categories" && (
        <>
          <section className="public-page-hero public-categories-hero">
            <div className="category-page-hero-copy">
              <span className="eyebrow">Explorar por necessidade</span>
              <h1>Uma cidade inteira de possibilidades.</h1>
              <p>
                Comece pela necessidade. Nós levamos você aos profissionais que
                trabalham com ela.
              </p>
            </div>
            <div className="category-page-hero-media">
              <img
                src={categoryCommunityEditorial}
                alt="Profissionais locais em atendimento, obra, oficina e evento"
              />
            </div>
          </section>
          <section className="category-section tp-categories" id="categorias">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Explore por necessidade</span>
                <h2>O que você quer fazer acontecer?</h2>
              </div>
            </div>
            <div className="category-grid">
              {categories.slice(0, 8).map((category, index) => (
                <button
                  className="category-card category-card-photo"
                  key={category.id}
                  onClick={() => chooseCategory(category)}
                >
                  <span
                    className="category-photo"
                    aria-hidden="true"
                    style={{
                      backgroundImage: `url(${categoryVisuals[index].image})`,
                      backgroundPosition: categoryVisuals[index].position,
                    }}
                  />
                  <span className="category-card-content">
                    <span className="category-card-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>{category.name}</strong>
                    <span className="category-card-link">
                      Explorar profissionais <b>→</b>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
      {publicPage === "services" && (
        <>
          <section className="public-page-hero public-services-hero">
            <div className="route-hero-photo" aria-hidden="true">
              <img src={categoryServicesEditorial} alt="" />
            </div>
            <span className="eyebrow">Serviços em destaque</span>
            <h1>Encontre o que a cidade está procurando.</h1>
            <p>
              Explore especialidades locais e siga direto para profissionais que
              podem atender você.
            </p>
          </section>
          <section className="category-section tp-categories services-page-grid">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Explore por serviço</span>
                <h2>Escolha uma necessidade para começar.</h2>
              </div>
              <a className="text-button" href={publicPaths.categories}>
                Ver todas as categorias →
              </a>
            </div>
            <div className="category-grid">
              {categories.slice(0, 8).map((category, index) => {
                const popularity = highlights?.popularCategories.find(
                  (item) => item.id === category.id,
                );
                return (
                  <button
                    className="category-card category-card-photo"
                    key={category.id}
                    onClick={() => chooseCategory(category)}
                  >
                    <span
                      className="category-photo"
                      aria-hidden="true"
                      style={{
                        backgroundImage: `url(${categoryVisuals[index].image})`,
                        backgroundPosition: categoryVisuals[index].position,
                      }}
                    />
                    <span className="category-card-content">
                      <span className="category-card-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <strong>{category.name}</strong>
                      <span className="category-card-link">
                        {highlightsLoading
                          ? "Explorar profissionais"
                          : popularity && popularity.requestCount > 0
                            ? `${popularity.requestCount} ${popularity.requestCount === 1 ? "pedido" : "pedidos"}`
                            : "Explorar profissionais"}
                        <b>→</b>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}
      {publicPage === "ratings" && (
        <>
          <section className="public-page-hero public-ratings-hero">
            <div className="route-hero-photo" aria-hidden="true">
              <img src={categoryCommunityEditorial} alt="" />
            </div>
            <span className="eyebrow">Avaliações verificadas</span>
            <h1>Reputação construída serviço por serviço.</h1>
            <p>
              As avaliações aparecem depois de serviços concluídos para ajudar
              você a escolher com mais segurança.
            </p>
          </section>
          <section className="featured-professionals ratings-page-content">
            <div className="featured-professionals-heading">
              <div>
                <span className="eyebrow">Mais bem avaliados</span>
                <h2>Profissionais reconhecidos pelos clientes.</h2>
              </div>
              <p>Perfis com reputação e informações claras para comparar.</p>
            </div>
            {highlightsLoading ? (
              <div
                className="featured-skeletons"
                aria-label="Carregando avaliações"
              >
                <span />
                <span />
                <span />
              </div>
            ) : highlights?.topRated.length ? (
              <div className="provider-grid featured-provider-grid">
                {highlights.topRated.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>
            ) : (
              <div className="featured-empty">
                <span aria-hidden="true">★</span>
                <div>
                  <strong>As primeiras avaliações estão a caminho.</strong>
                  <p>
                    Quando um serviço for concluído, clientes poderão registrar
                    uma avaliação verificada.
                  </p>
                </div>
              </div>
            )}
          </section>
        </>
      )}
      {publicPage === "advertising" && (
        <>
          <section className="public-page-hero public-advertising-hero">
            <div className="route-hero-photo" aria-hidden="true">
              <img src={categoryCommunityEditorial} alt="" />
            </div>
            <span className="eyebrow">Vitrine local</span>
            <h1>Visibilidade para quem movimenta a cidade.</h1>
            <p>
              Apresente sua empresa para pessoas que já estão procurando por
              serviços na região.
            </p>
          </section>
          <AdvertisingArea api={api} />
        </>
      )}
      {publicPage === "how" && (
        <>
          <section className="how-section tp-how" id="como-funciona">
            <div className="how-intro">
              <span className="eyebrow">Contratar ficou mais simples</span>
              <h2>Do que você precisa ao contato certo.</h2>
              <p>
                Diga o que precisa uma única vez. A gente aproxima profissionais
                da sua região para você decidir com calma.
              </p>
              <button
                className="button button-dark"
                onClick={() => onRegister("CUSTOMER")}
              >
                Pedir um serviço <span>→</span>
              </button>
            </div>
            <figure className="how-route-image">
              <img
                src={categoryCommunityEditorial}
                alt="Profissionais atendendo clientes na cidade"
              />
            </figure>
            <div className="steps" aria-label="Como contratar pelo TPServiços">
              <article>
                <span className="step-no">01</span>
                <div>
                  <span className="step-label">Comece por você</span>
                  <h3>Conte o que precisa.</h3>
                  <p>
                    Escolha a categoria, explique o serviço e indique onde ele
                    acontece.
                  </p>
                </div>
              </article>
              <article>
                <span className="step-no">02</span>
                <div>
                  <span className="step-label">Conheça as opções</span>
                  <h3>Explore quem pode ajudar.</h3>
                  <p>
                    Veja especialidades, regiões atendidas e reputação antes de
                    escolher.
                  </p>
                </div>
              </article>
              <article>
                <span className="step-no">03</span>
                <div>
                  <span className="step-label">Decida no seu ritmo</span>
                  <h3>Combine diretamente.</h3>
                  <p>
                    Converse, receba o orçamento e alinhe os detalhes com quem
                    vai realizar o serviço.
                  </p>
                </div>
              </article>
            </div>
          </section>
        </>
      )}
      <footer className="site-footer">
        <button className="brand" onClick={() => onNavigate("home")}>
          <span className="brand-mark">TP</span>
          <span>
            TP<span className="brand-accent">Serviços</span>
          </span>
        </button>
        <nav className="footer-links" aria-label="Atalhos do rodapé">
          {(
            [
              ["professionals", "Profissionais"],
              ["advertising", "Vitrine"],
              ["categories", "Categorias"],
              ["services", "Serviços"],
              ["ratings", "Avaliações"],
              ["how", "Como funciona"],
              ["terms", "Termos"],
              ["privacy", "Privacidade"],
            ] as const
          ).map(([page, label]) => (
            <a href={publicPaths[page]} key={page}>
              {label}
            </a>
          ))}
        </nav>
        <span className="footer-tagline">
          Serviços locais, conexões de confiança.
        </span>
        <span>© 2026 TPServiços</span>
      </footer>
      {selectedProvider && (
        <ProviderProfilePreview
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onRequest={() => {
            setSelectedProvider(null);
            onRegister("CUSTOMER");
          }}
        />
      )}
    </>
  );
}

function AdvertisingArea({ api }: { api: ApiCall }) {
  const [ads, setAds] = useState<SponsoredAd[]>([]);
  const [plans, setPlans] = useState<AdvertisingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    let inFlight = false;
    async function loadAdvertising() {
      if (inFlight) return;
      inFlight = true;
      try {
        const [activeAds, availablePlans] = await Promise.all([
          api<SponsoredAd[]>("/advertisements/active"),
          api<AdvertisingPlan[]>("/advertisements/packages"),
        ]);
        if (!mounted) return;
        setAds(activeAds);
        setPlans(availablePlans);
        setError("");
      } catch (e) {
        if (mounted)
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível carregar os destaques da cidade.",
          );
      } finally {
        inFlight = false;
        if (mounted) setLoading(false);
      }
    }
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void loadAdvertising();
    }
    void loadAdvertising();
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const refreshInterval = window.setInterval(refreshWhenVisible, 60_000);
    return () => {
      mounted = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [api]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const websiteUrl = String(data.websiteUrl ?? "").trim();
      const logoUrl = String(data.logoUrl ?? "").trim();
      const request = await api<{
        amountInCents: number;
        package: { name: string; durationDays: number };
      }>("/advertisements/requests", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          websiteUrl: websiteUrl || undefined,
          logoUrl: logoUrl || undefined,
          contactConsent: data.contactConsent === "on",
        }),
      });
      setNotice(
        `Pedido recebido para “${request.package.name}” (${money(request.amountInCents)}). Nossa equipe entrará em contato para confirmar o pagamento e publicar a marca.`,
      );
      form.reset();
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível enviar o pedido.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="sponsored-section" id="anunciar">
        <div className="sponsored-heading">
          <div>
            <span className="eyebrow">Vitrine patrocinada</span>
            <h2>Empresas e serviços em destaque</h2>
            <p>Conheça marcas locais que apoiam e movimentam a nossa cidade.</p>
          </div>
          <button
            className="button button-dark"
            type="button"
            onClick={() => {
              setError("");
              setOpen(true);
            }}
          >
            Anuncie sua empresa <span aria-hidden="true">↗</span>
          </button>
        </div>
        {error && !open && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="alert alert-success" role="status" aria-live="polite">
            {notice}
          </p>
        )}
        {ads.length ? (
          <div className="sponsored-grid" aria-busy={loading}>
            {ads.map((ad) => (
              <article className="sponsored-card" key={ad.id}>
                <div className="sponsored-card-top">
                  <div className="sponsored-logo">
                    {ad.logoUrl ? (
                      <img
                        src={ad.logoUrl}
                        alt={`Logo ${ad.companyName}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          event.currentTarget.hidden = true;
                        }}
                      />
                    ) : (
                      <span aria-hidden="true">
                        {ad.companyName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="sponsored-badge">Patrocinado</span>
                </div>
                <span className="sponsored-category">{ad.category}</span>
                <h3>{ad.companyName}</h3>
                <p className="sponsored-description">{ad.description}</p>
                <div className="sponsored-card-footer">
                  <span>⌖ {ad.city}</span>
                  {ad.websiteUrl ? (
                    <a
                      href={ad.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Conhecer <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <span className="sponsored-local">Empresa local</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="sponsored-empty">
            <div className="sponsored-empty-mark" aria-hidden="true">
              TP
            </div>
            <div>
              <span className="sponsored-badge">Sua marca aqui</span>
              <h3>
                {loading
                  ? "Carregando os destaques…"
                  : "Mais visibilidade para quem faz a cidade acontecer."}
              </h3>
              <p>
                Divulgue sua empresa para pessoas que já estão procurando
                serviços na região.
              </p>
            </div>
            <button
              className="button button-dark"
              type="button"
              onClick={() => {
                setError("");
                setOpen(true);
              }}
            >
              Ver planos de anúncio <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </section>

      {open && (
        <div className="sponsored-modal-backdrop">
          <section
            className="sponsored-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sponsored-modal-title"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !submitting) setOpen(false);
            }}
          >
            <button
              className="sponsored-modal-close"
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar formulário de anúncio"
              disabled={submitting}
            >
              ×
            </button>
            <span className="eyebrow">Divulgue sua marca</span>
            <h2 id="sponsored-modal-title">Anuncie no TPServiços</h2>
            <p className="sponsored-modal-intro">
              Escolha um plano e conte um pouco sobre sua empresa. A equipe
              confirma o pagamento antes de publicar o anúncio.
            </p>
            {error && (
              <p className="alert alert-error" role="alert">
                {error}
              </p>
            )}
            {!plans.length ? (
              <div className="sponsored-no-plans">
                <strong>Planos em preparação</strong>
                <p>
                  Estamos configurando os espaços pagos de divulgação. Tente
                  novamente em breve.
                </p>
                <button
                  className="button button-light"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Entendi
                </button>
              </div>
            ) : (
              <form
                className="sponsored-form"
                onSubmit={(event) => void submit(event)}
              >
                <label className="sponsored-form-plan">
                  <span>Plano de divulgação</span>
                  <select name="packageId" required defaultValue="">
                    <option value="" disabled>
                      Selecione um plano
                    </option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} · {plan.durationDays} dias ·{" "}
                        {money(plan.amountInCents)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="sponsored-form-grid">
                  <label>
                    <span>Nome da empresa</span>
                    <input
                      name="companyName"
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder="Ex.: HPS Sistemas"
                    />
                  </label>
                  <label>
                    <span>Categoria ou segmento</span>
                    <input
                      name="category"
                      required
                      minLength={2}
                      maxLength={80}
                      placeholder="Ex.: Tecnologia"
                    />
                  </label>
                  <label>
                    <span>Cidade</span>
                    <input
                      name="city"
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Três Pontas"
                    />
                  </label>
                  <label>
                    <span>Site da empresa (opcional)</span>
                    <input
                      name="websiteUrl"
                      type="url"
                      maxLength={500}
                      placeholder="https://suaempresa.com.br"
                    />
                  </label>
                  <label className="sponsored-form-wide">
                    <span>Link direto para o logo (opcional)</span>
                    <input
                      name="logoUrl"
                      type="url"
                      maxLength={500}
                      placeholder="https://suaempresa.com.br/logo.png"
                    />
                  </label>
                  <label className="sponsored-form-wide">
                    <span>Apresentação do serviço</span>
                    <textarea
                      name="description"
                      required
                      minLength={12}
                      maxLength={600}
                      rows={3}
                      placeholder="Descreva seus principais produtos ou serviços."
                    />
                  </label>
                  <label>
                    <span>Responsável pelo anúncio</span>
                    <input
                      name="contactName"
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      placeholder="Seu nome"
                    />
                  </label>
                  <label>
                    <span>E-mail de contato</span>
                    <input
                      name="contactEmail"
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="email"
                      placeholder="voce@empresa.com.br"
                    />
                  </label>
                  <label className="sponsored-form-wide">
                    <span>Telefone ou WhatsApp</span>
                    <input
                      name="contactPhone"
                      type="tel"
                      required
                      minLength={8}
                      maxLength={25}
                      autoComplete="tel"
                      placeholder="(35) 99999-9999"
                    />
                  </label>
                </div>
                <label className="sponsored-consent">
                  <input name="contactConsent" type="checkbox" required />
                  <span>
                    Autorizo o TPServiços a usar estes dados para tratar do
                    anúncio e confirmar o pagamento.
                  </span>
                </label>
                <div className="sponsored-form-actions">
                  <button
                    className="button button-light"
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button className="button button-dark" disabled={submitting}>
                    {submitting ? "Enviando pedido…" : "Solicitar anúncio pago"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <article className="provider-card directory-card">
      <div className="directory-card-top">
        <div className="provider-avatar">
          {provider.avatarUrl ? (
            <img src={provider.avatarUrl} alt="" />
          ) : (
            provider.user.name.slice(0, 1).toUpperCase()
          )}
        </div>
        {provider.verifiedAt && <span className="verified">✓ Verificado</span>}
      </div>
      <h3>{provider.user.name}</h3>
      <span className="provider-subtitle directory-category">
        <span aria-hidden="true">◇</span>
        {provider.categories.map((item) => item.category.name).join(" · ")}
      </span>
      <p className="directory-bio">
        {provider.bio || "Profissional da sua região pronto para ajudar."}
      </p>
      <div className="provider-meta directory-meta">
        <span>⌖ {provider.city}</span>
        <span>
          {provider.averageScore
            ? `★ ${provider.averageScore.toFixed(1)}${provider.ratingCount ? ` · ${provider.ratingCount} ${provider.ratingCount === 1 ? "avaliação" : "avaliações"}` : ""}`
            : "Novo no TPServiços"}
        </span>
      </div>
      {(provider.availability || provider.priceFromCents) && (
        <div className="provider-availability">
          <span>{provider.availability || "Disponibilidade a combinar"}</span>
          {provider.priceFromCents && (
            <b>A partir de {money(provider.priceFromCents)}</b>
          )}
        </div>
      )}
      <a
        href={`/profissional/${encodeURIComponent(provider.id)}`}
        className="provider-card-action"
      >
        Conhecer perfil <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}

function ProviderProfilePreview({
  provider,
  onClose,
  onRequest,
}: {
  provider: Provider;
  onClose: () => void;
  onRequest: () => void;
}) {
  const categoryNames = provider.categories.map((item) => item.category.name);
  return (
    <div
      className="provider-preview-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="provider-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-preview-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
        tabIndex={-1}
      >
        <button
          type="button"
          className="provider-preview-close"
          onClick={onClose}
          aria-label="Fechar perfil"
          autoFocus
        >
          ×
        </button>
        <div className="provider-preview-hero">
          <span className="provider-preview-eyebrow">Perfil local</span>
          <div className="provider-preview-heading">
            <span className="provider-preview-avatar" aria-hidden="true">
              {provider.avatarUrl ? (
                <img src={provider.avatarUrl} alt="" />
              ) : (
                provider.user.name.slice(0, 1).toUpperCase()
              )}
            </span>
            <div>
              <h2 id="provider-preview-title">{provider.user.name}</h2>
              <p>
                ⌖ {provider.city}
                {provider.verifiedAt ? " · Perfil verificado" : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="provider-preview-content">
          <section>
            <span className="provider-preview-label">Especialidades</span>
            <div className="provider-preview-tags">
              {categoryNames.length ? (
                categoryNames.map((name) => <span key={name}>{name}</span>)
              ) : (
                <span>Serviços locais</span>
              )}
            </div>
          </section>
          <section className="provider-preview-about">
            <span className="provider-preview-label">Sobre o trabalho</span>
            <p>
              {provider.bio ||
                "Profissional da sua região, disponível para entender a sua necessidade."}
            </p>
          </section>
          <section className="provider-preview-service">
            <span className="provider-preview-label">Atendimento</span>
            <p>
              {provider.availability || "Disponibilidade a combinar"}
              {provider.priceFromCents
                ? ` · A partir de ${money(provider.priceFromCents)}`
                : ""}
            </p>
          </section>
          {!!provider.portfolioUrls?.length && (
            <section className="provider-preview-portfolio">
              <span className="provider-preview-label">Portfólio</span>
              <div>
                {provider.portfolioUrls.slice(0, 4).map((url) => (
                  <img key={url} src={url} alt="Trabalho realizado" />
                ))}
              </div>
            </section>
          )}
          <section className="provider-preview-reputation">
            <span className="provider-preview-label">Reputação</span>
            {provider.averageScore ? (
              <strong>
                ★ {provider.averageScore.toFixed(1)}
                {provider.ratingCount
                  ? ` · ${provider.ratingCount} ${provider.ratingCount === 1 ? "avaliação" : "avaliações"}`
                  : ""}
              </strong>
            ) : (
              <p>
                Este perfil ainda não possui avaliações verificadas na
                plataforma.
              </p>
            )}
          </section>
        </div>
        <div className="provider-preview-footer">
          <div>
            <strong>Precisa deste serviço?</strong>
            <span>
              Publique seu pedido para receber contatos na sua região.
            </span>
          </div>
          <button
            type="button"
            className="button button-dark"
            onClick={onRequest}
          >
            Pedir um serviço <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function AuthPanel({
  mode,
  role,
  onMode,
  onRole,
  onAuthenticated,
  onBack,
}: {
  mode: Exclude<AppMode, "home">;
  role: "CUSTOMER" | "PROVIDER";
  onMode: (mode: AppMode) => void;
  onRole: (role: "CUSTOMER" | "PROVIDER") => void;
  onAuthenticated: (session: Session) => void;
  onBack: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const resetToken = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (mode !== "confirm") return;
    if (!resetToken) {
      setError("O link de confirmação está incompleto.");
      return;
    }
    let disposed = false;
    setBusy(true);
    void fetch(`${API}/auth/email-verification/confirm`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken }),
    })
      .then((response) => parseResponse<{ ok: boolean }>(response))
      .then(() => {
        if (!disposed)
          setNotice("E-mail confirmado. Agora você pode entrar na sua conta.");
      })
      .catch((reason) => {
        if (!disposed)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível confirmar o e-mail.",
          );
      })
      .finally(() => {
        if (!disposed) setBusy(false);
      });
    return () => {
      disposed = true;
    };
  }, [mode, resetToken]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      if (mode === "recover") {
        const result = await parseResponse<{ deliveryConfigured: boolean }>(
          await fetch(`${API}/auth/password-reset/request`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: values.email }),
          }),
        );
        setNotice(
          result.deliveryConfigured
            ? "Se existir uma conta com este e-mail, você receberá um link de recuperação."
            : "A recuperação foi registrada. Configure o e-mail transacional antes de disponibilizar este fluxo aos usuários.",
        );
        return;
      }
      if (mode === "reset") {
        if (values.password !== values.passwordConfirmation)
          throw new Error("As senhas não coincidem.");
        if (!resetToken)
          throw new Error("O link de recuperação está incompleto.");
        await parseResponse<{ ok: boolean }>(
          await fetch(`${API}/auth/password-reset/confirm`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: resetToken,
              password: values.password,
            }),
          }),
        );
        window.history.replaceState({}, "", "/");
        setNotice("Senha redefinida com sucesso. Entre com sua nova senha.");
        onMode("login");
        return;
      }
      if (
        mode === "register" &&
        values.password !== values.passwordConfirmation
      )
        throw new Error("As senhas não coincidem.");
      const { passwordConfirmation: _passwordConfirmation, ...authValues } =
        values;
      const result = await parseResponse<Session>(
        await fetch(
          `${API}/auth/${mode === "register" ? "register" : "login"}`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...authValues,
              ...(mode === "register"
                ? {
                    role,
                    termsAccepted: values.termsAccepted === "on",
                    privacyAccepted: values.privacyAccepted === "on",
                  }
                : {}),
            }),
          },
        ),
      );
      onAuthenticated(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }
  const heading =
    mode === "login"
      ? "Entrar na sua conta"
      : mode === "register"
        ? role === "PROVIDER"
          ? "Cadastre-se como profissional"
          : "Crie sua conta"
        : mode === "recover"
          ? "Recupere seu acesso"
          : mode === "reset"
            ? "Defina uma nova senha"
            : "Confirmando seu e-mail";
  const description =
    mode === "login"
      ? "Acesse seus pedidos e acompanhe suas conexões."
      : mode === "register"
        ? role === "PROVIDER"
          ? "Mostre seu trabalho e encontre novos clientes."
          : "Publique seu pedido e encontre quem pode ajudar."
        : mode === "recover"
          ? "Informe seu e-mail e enviaremos um link temporário e seguro."
          : mode === "reset"
            ? "Essa alteração encerra as outras sessões da sua conta."
            : "Estamos validando este link seguro.";
  return (
    <main className="auth-page">
      <div className="auth-side">
        <button className="back-link" onClick={onBack}>
          ← Voltar ao início
        </button>
        <div className="auth-message">
          <div className="auth-brand">
            <span className="brand-mark large">TP</span>
            <span className="auth-brand-copy">
              <strong>TPServiços</strong>
              <small>PROFISSIONAIS DA SUA CIDADE</small>
            </span>
          </div>
          <h1>Boas conexões começam por aqui.</h1>
          <p>
            O TPServiços aproxima você dos profissionais que fazem a diferença
            na sua cidade.
          </p>
        </div>
        <span className="auth-side-foot">
          Uma cidade melhor, serviço por serviço.
        </span>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form-box">
          <span className="eyebrow">
            {mode === "login"
              ? "Que bom ter você de volta"
              : mode === "register"
                ? "Faça parte da comunidade"
                : "Segurança da conta"}
          </span>
          <h2>{heading}</h2>
          <p>{description}</p>
          {mode === "register" && (
            <div className="role-switch">
              <button
                className={role === "CUSTOMER" ? "selected" : ""}
                onClick={() => onRole("CUSTOMER")}
                type="button"
              >
                Quero contratar
              </button>
              <button
                className={role === "PROVIDER" ? "selected" : ""}
                onClick={() => onRole("PROVIDER")}
                type="button"
              >
                Sou profissional
              </button>
            </div>
          )}
          {mode === "confirm" ? (
            <div className="auth-form">
              {busy && <p className="form-note">Confirmando…</p>}
              {error && <p className="alert alert-error">{error}</p>}
              {notice && <p className="alert alert-success">{notice}</p>}
              <button
                className="button button-dark full-width"
                type="button"
                onClick={() => {
                  window.history.replaceState({}, "", "/");
                  onMode("login");
                }}
              >
                Ir para entrar
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={submit}>
              {mode === "register" && (
                <label>
                  Nome completo
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    placeholder="Como podemos chamar você?"
                  />
                </label>
              )}
              {mode === "register" && (
                <label className="consent-check auth-consent">
                  <input name="termsAccepted" type="checkbox" required />
                  <span>Li e aceito os Termos de Uso da plataforma.</span>
                </label>
              )}
              {mode === "register" && (
                <label className="consent-check auth-consent">
                  <input name="privacyAccepted" type="checkbox" required />
                  <span>
                    Li e aceito a Política de Privacidade e o uso dos meus dados
                    para viabilizar as contratações.
                  </span>
                </label>
              )}
              {mode !== "reset" && (
                <label>
                  E-mail
                  <input
                    name="email"
                    required
                    type="email"
                    autoComplete="email"
                    placeholder="voce@email.com"
                  />
                </label>
              )}
              {mode === "register" && (
                <label>
                  Telefone / WhatsApp
                  <input
                    name="phone"
                    required
                    minLength={10}
                    maxLength={30}
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                  />
                </label>
              )}
              {mode !== "recover" && (
                <label>
                  Senha
                  <input
                    name="password"
                    required
                    type="password"
                    minLength={mode === "login" ? 1 : 10}
                    maxLength={128}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    placeholder={
                      mode === "login"
                        ? "Sua senha"
                        : mode === "register" || mode === "reset"
                          ? "10+ caracteres, maiúscula, minúscula e número"
                          : ""
                    }
                  />
                </label>
              )}
              {(mode === "register" || mode === "reset") && (
                <label>
                  Confirmar senha
                  <input
                    name="passwordConfirmation"
                    required
                    type="password"
                    minLength={10}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="Digite a senha novamente"
                  />
                </label>
              )}
              {error && (
                <p className="alert alert-error" role="alert">
                  {error}
                </p>
              )}
              {notice && <p className="alert alert-success">{notice}</p>}
              <button className="button button-dark full-width" disabled={busy}>
                {busy
                  ? "Aguarde…"
                  : mode === "register"
                    ? "Criar minha conta"
                    : mode === "recover"
                      ? "Enviar link de recuperação"
                      : mode === "reset"
                        ? "Redefinir senha"
                        : "Entrar"}
              </button>
            </form>
          )}
          <p className="auth-switch">
            {mode === "recover" || mode === "reset"
              ? "Lembrou a senha?"
              : mode === "login"
                ? "Ainda não tem uma conta?"
                : "Já tem uma conta?"}{" "}
            <button
              onClick={() => onMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </button>
            {mode === "login" && (
              <button
                className="auth-recovery-link"
                type="button"
                onClick={() => {
                  window.history.pushState({}, "", "/recuperar-senha");
                  onMode("recover");
                }}
              >
                Esqueci minha senha
              </button>
            )}
          </p>
          <p className="privacy-note">
            Ao continuar, você concorda com nossos Termos de Uso e Política de
            Privacidade.
          </p>
        </div>
      </div>
    </main>
  );
}

function RatingForm({
  item,
  api,
  onSaved,
}: {
  item: RequestItem;
  api: ApiCall;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setError("");
    try {
      await api(`/requests/${item.id}/rating`, {
        method: "POST",
        body: JSON.stringify({ ...values, score: Number(values.score) }),
      });
      onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar a avaliação.",
      );
    }
  }
  return (
    <form className="rating-form" onSubmit={submit}>
      <input
        type="hidden"
        name="providerId"
        value={item.acceptedProvider?.id ?? ""}
      />
      <span className="rating-provider">
        Avaliar{" "}
        <strong>
          {item.acceptedProvider?.name ?? "profissional contratado"}
        </strong>
      </span>
      <label>
        Nota
        <select name="score" defaultValue="5">
          <option value="5">5 · Ótimo</option>
          <option value="4">4 · Bom</option>
          <option value="3">3 · Regular</option>
          <option value="2">2 · Ruim</option>
          <option value="1">1 · Péssimo</option>
        </select>
      </label>
      <button className="button button-green">Enviar avaliação</button>
      {error && <span className="alert alert-error">{error}</span>}
    </form>
  );
}

function RequestEngagement({
  api,
  requestId,
  requestTitle,
  role,
  peers,
  onChanged,
}: {
  api: ApiCall;
  requestId: string;
  requestTitle: string;
  role: "CUSTOMER" | "PROVIDER";
  peers: { id: string; name: string }[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState(peers[0]?.id ?? "");

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError("");
    try {
      const [proposalList, messageList] = await Promise.all([
        api<Proposal[]>(`/requests/${requestId}/proposals`),
        api<DirectMessage[]>(`/requests/${requestId}/messages`),
      ]);
      setProposals(proposalList);
      setMessages(messageList);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar a conversa.",
      );
    } finally {
      setLoading(false);
    }
  }, [api, open, requestId]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!selectedPeerId && peers[0]) setSelectedPeerId(peers[0].id);
  }, [peers, selectedPeerId]);

  async function sendProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const price = String(values.price ?? "").trim();
    setError("");
    try {
      await api(`/requests/${requestId}/proposals`, {
        method: "POST",
        body: JSON.stringify({
          summary: values.summary,
          ...(price ? { priceCents: Math.round(Number(price) * 100) } : {}),
          ...(values.scheduledFor ? { scheduledFor: values.scheduledFor } : {}),
        }),
      });
      event.currentTarget.reset();
      await load();
      onChanged();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar a proposta.",
      );
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (!selectedPeerId) return;
    setError("");
    try {
      await api(`/requests/${requestId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: values.body,
          recipientId: selectedPeerId,
          attachmentUrls: String(values.attachmentUrls ?? "")
            .split(/\n|,/)
            .map((url) => url.trim())
            .filter(Boolean),
        }),
      });
      form.reset();
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar a mensagem.",
      );
    }
  }

  async function accept(proposal: Proposal) {
    if (!window.confirm(`Aceitar a proposta de ${proposal.provider.name}?`))
      return;
    setError("");
    try {
      await api(`/requests/${requestId}/proposals/${proposal.id}/accept`, {
        method: "POST",
      });
      await load();
      onChanged();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível aceitar a proposta.",
      );
    }
  }

  async function reportRequest() {
    const reason = window.prompt("Por que este pedido precisa ser revisado?");
    if (!reason?.trim()) return;
    try {
      await api("/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType: "REQUEST",
          targetId: requestId,
          reason: reason.trim(),
        }),
      });
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível registrar a denúncia.",
      );
    }
  }

  const selectedMessages = messages.filter(
    (message) =>
      message.sender.id === selectedPeerId ||
      message.recipient.id === selectedPeerId,
  );

  return (
    <section className="request-engagement">
      <div className="request-engagement-head">
        <button type="button" onClick={() => setOpen((value) => !value)}>
          {open ? "Fechar proposta e conversa" : "Proposta e conversa"}
        </button>
        <button
          type="button"
          className="subtle-action"
          onClick={() => void reportRequest()}
        >
          Denunciar pedido
        </button>
      </div>
      {open && (
        <div className="request-engagement-body">
          <header>
            <span>Contratação protegida</span>
            <strong>{requestTitle}</strong>
          </header>
          {loading && <p className="engagement-loading">Atualizando…</p>}
          {error && <p className="alert alert-error">{error}</p>}
          <div className="proposal-thread-grid">
            <section className="proposal-thread">
              <div className="thread-title">
                <strong>Propostas</strong>
                <small>
                  {role === "CUSTOMER"
                    ? "Compare e escolha com clareza"
                    : "Envie uma proposta objetiva"}
                </small>
              </div>
              {proposals.length ? (
                <ol className="proposal-list">
                  {proposals.map((proposal) => (
                    <li key={proposal.id}>
                      <div>
                        <strong>{proposal.provider.name}</strong>
                        <span
                          className={`proposal-status ${proposal.status.toLowerCase()}`}
                        >
                          {proposal.status === "SENT"
                            ? "Aguardando decisão"
                            : proposal.status === "ACCEPTED"
                              ? "Aceita"
                              : "Não selecionada"}
                        </span>
                      </div>
                      <p>{proposal.summary}</p>
                      <small>
                        {proposal.priceCents !== null
                          ? money(proposal.priceCents)
                          : "Valor a combinar"}
                        {proposal.scheduledFor
                          ? ` · Sugestão: ${date(proposal.scheduledFor)}`
                          : ""}
                      </small>
                      {role === "CUSTOMER" && proposal.status === "SENT" && (
                        <button
                          type="button"
                          onClick={() => void accept(proposal)}
                        >
                          Aceitar proposta
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="thread-empty">Nenhuma proposta enviada ainda.</p>
              )}
              {role === "PROVIDER" && (
                <form className="proposal-form" onSubmit={sendProposal}>
                  <textarea
                    name="summary"
                    required
                    minLength={12}
                    maxLength={2000}
                    rows={3}
                    placeholder="Explique como você fará o serviço, o que está incluso e próximos passos."
                  />
                  <div>
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Valor em R$ (opcional)"
                    />
                    <input name="scheduledFor" type="date" />
                  </div>
                  <button className="button button-dark">
                    Enviar proposta
                  </button>
                </form>
              )}
            </section>
            <section className="message-thread">
              <div className="thread-title">
                <strong>Conversa direta</strong>
                {peers.length > 1 ? (
                  <select
                    aria-label="Escolher profissional para conversar"
                    value={selectedPeerId}
                    onChange={(event) => setSelectedPeerId(event.target.value)}
                  >
                    {peers.map((peer) => (
                      <option key={peer.id} value={peer.id}>
                        {peer.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <small>{peers[0]?.name ?? "Sem contato disponível"}</small>
                )}
              </div>
              <div className="message-list">
                {selectedMessages.length ? (
                  selectedMessages.map((message) => (
                    <article
                      key={message.id}
                      className={
                        message.recipient.id === selectedPeerId
                          ? "from-me"
                          : "from-peer"
                      }
                    >
                      <strong>{message.sender.name}</strong>
                      <p>{message.body}</p>
                      {!!message.attachmentUrls?.length && (
                        <div className="message-attachments">
                          {message.attachmentUrls.map((url, index) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Anexo {index + 1} ↗
                            </a>
                          ))}
                        </div>
                      )}
                      <small>{date(message.createdAt)}</small>
                    </article>
                  ))
                ) : (
                  <p className="thread-empty">
                    Comece uma conversa pelo TPServiços.
                  </p>
                )}
              </div>
              {selectedPeerId && (
                <form className="message-form" onSubmit={sendMessage}>
                  <textarea
                    name="body"
                    required
                    minLength={1}
                    maxLength={2000}
                    rows={2}
                    placeholder="Escreva uma mensagem…"
                  />
                  <input
                    name="attachmentUrls"
                    type="url"
                    placeholder="Link de imagem ou arquivo (opcional)"
                  />
                  <button className="button button-green">Enviar</button>
                </form>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  );
}

function CustomerDashboard({
  api,
  categories,
}: {
  api: ApiCall;
  categories: Category[];
}) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      setRequests(await api<RequestItem[]>("/requests/mine"));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar seus pedidos.",
      );
    }
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setError("");
    setNotice("");
    try {
      await api("/requests", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          contactConsent: values.contactConsent === "on",
        }),
      });
      form.reset();
      setNotice(
        "Pedido publicado! Profissionais compatíveis poderão entrar em contato.",
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível publicar o pedido.",
      );
    }
  }
  async function complete(item: RequestItem) {
    if (
      !window.confirm(
        "Confirmar que o serviço foi realizado? Você poderá avaliar o profissional em seguida.",
      )
    )
      return;
    try {
      await api(`/requests/${item.id}/complete`, { method: "POST" });
      setNotice("Pedido concluído. Conte como foi o atendimento.");
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível concluir o pedido.",
      );
    }
  }
  async function cancel(item: RequestItem) {
    if (
      !window.confirm(
        "Cancelar este pedido? Profissionais que já o visualizaram não poderão mais desbloquear o contato.",
      )
    )
      return;
    try {
      await api(`/requests/${item.id}/cancel`, { method: "PATCH" });
      setNotice("Pedido cancelado.");
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível cancelar o pedido.",
      );
    }
  }
  return (
    <main className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">Área do cliente</span>
          <h1>Meus pedidos</h1>
          <p>Descreva o serviço que procura e acompanhe as respostas.</p>
        </div>
      </div>
      {notice && <p className="alert alert-success">{notice}</p>}
      {error && <p className="alert alert-error">{error}</p>}
      <div className="dashboard-grid">
        <section className="panel request-panel">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">Novo pedido</span>
              <h2>O que você precisa?</h2>
            </div>
            <span className="free-badge">Grátis</span>
          </div>
          <form className="stack-form" onSubmit={submit}>
            <label>
              Tipo de serviço
              <select name="categoryId" required defaultValue="">
                <option value="" disabled>
                  Selecione uma categoria
                </option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Resuma o serviço
              <input
                name="title"
                required
                minLength={3}
                maxLength={120}
                placeholder="Ex.: Instalar uma torneira"
              />
            </label>
            <label>
              Conte mais detalhes
              <textarea
                name="description"
                required
                minLength={10}
                maxLength={3000}
                rows={4}
                placeholder="Explique o que precisa ser feito..."
              />
            </label>
            <div className="field-row">
              <label>
                Cidade
                <input
                  name="city"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Sua cidade"
                />
              </label>
              <label>
                Bairro
                <input
                  name="neighborhood"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Seu bairro"
                />
              </label>
            </div>
            <label className="consent-check">
              <input name="contactConsent" type="checkbox" required />
              <span>
                Autorizo o compartilhamento do meu telefone e e-mail com os
                profissionais que desbloquearem este pedido.
              </span>
            </label>
            <button className="button button-green full-width">
              Publicar pedido grátis <span>→</span>
            </button>
            <small className="form-note">
              Seus dados de contato só serão compartilhados com profissionais
              que desbloquearem seu pedido.
            </small>
          </form>
        </section>
        <section className="panel list-panel">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">Histórico</span>
              <h2>Pedidos recentes</h2>
            </div>
            <span className="count-pill">{requests.length}</span>
          </div>
          {requests.length ? (
            <div className="request-list">
              {requests.map((item) => (
                <article className="request-row" key={item.id}>
                  <div className="request-icon">⌂</div>
                  <div className="request-copy">
                    <div className="request-title-line">
                      <h3>{item.title}</h3>
                      <span
                        className={`status-pill status-${item.status.toLowerCase()}`}
                      >
                        {item.status === "OPEN"
                          ? "Aberto"
                          : item.status === "CANCELLED"
                            ? "Cancelado"
                            : item.status === "COMPLETED"
                              ? "Concluído"
                              : item.status === "IN_PROGRESS"
                                ? "Em andamento"
                                : item.status}
                      </span>
                    </div>
                    <p>
                      {item.category.name} · {item.neighborhood}, {item.city}
                    </p>
                    <small>
                      {date(item.createdAt)} · {item.unlockedCount ?? 0}{" "}
                      profissional(is) interessado(s)
                    </small>
                    {!!item.statusHistory?.length && (
                      <ol
                        className="status-history"
                        aria-label="Histórico do pedido"
                      >
                        {item.statusHistory.map((event) => (
                          <li key={event.id}>
                            <span>{requestStatusLabel(event.status)}</span>
                            <time dateTime={event.createdAt}>
                              {date(event.createdAt)}
                            </time>
                          </li>
                        ))}
                      </ol>
                    )}
                    {item.unlocks?.length ? (
                      <div className="response-list">
                        {item.unlocks.map((unlock) => (
                          <span key={unlock.id}>
                            Profissional:{" "}
                            <strong>{unlock.provider.name}</strong>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {item.acceptedProvider && (
                      <p className="accepted-provider">
                        Profissional contratado:{" "}
                        <strong>{item.acceptedProvider.name}</strong>
                      </p>
                    )}
                    {!!item.unlocks?.length && (
                      <RequestEngagement
                        api={api}
                        requestId={item.id}
                        requestTitle={item.title}
                        role="CUSTOMER"
                        peers={item.unlocks.map((unlock) => ({
                          id: unlock.providerId,
                          name: unlock.provider.name,
                        }))}
                        onChanged={() => void load()}
                      />
                    )}
                    {item.status === "IN_PROGRESS" && item.acceptedProvider && (
                      <button
                        className="text-button complete-button"
                        onClick={() => void complete(item)}
                      >
                        Marcar serviço como concluído →
                      </button>
                    )}
                    {item.status === "OPEN" && (
                      <button
                        className="text-button cancel-request-button"
                        onClick={() => void cancel(item)}
                      >
                        Cancelar pedido
                      </button>
                    )}
                    {item.status === "COMPLETED" && item.rating && (
                      <p className="rating-done">
                        Sua avaliação: {item.rating.score}/5 ★
                      </p>
                    )}
                    {item.status === "COMPLETED" &&
                      !item.rating &&
                      !!item.acceptedProvider && (
                        <RatingForm
                          item={item}
                          api={api}
                          onSaved={() => {
                            setNotice("Obrigado pela avaliação.");
                            void load();
                          }}
                        />
                      )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span>✎</span>
              <strong>Seus pedidos aparecerão aqui</strong>
              <p>Conte o que precisa no formulário para começar.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ProviderDashboard({ api }: { api: ApiCall }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<{
    id: string;
    city: string;
    bio: string;
    serviceAreas: string[];
    availability: string;
    priceFromCents: number | null;
    serviceRadiusKm: number;
    portfolioUrls: string[];
    avatarUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    verificationStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED";
    verificationNote: string | null;
    verificationDocumentUrls: string[];
    categories: { category: Category }[];
  } | null>(null);
  const [opportunities, setOpportunities] = useState<RequestItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [packages, setPackages] = useState<
    { id: string; name: string; credits: number; amountInCents: number }[]
  >([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [serviceAreas, setServiceAreas] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      const [categoryList, profileResult, wallet, packageList, contactList] =
        await Promise.all([
          api<Category[]>("/categories"),
          api<any>("/providers/me"),
          api<any>("/wallet"),
          api<any[]>("/wallet/packages"),
          api<Contact[]>("/providers/contacts"),
        ]);
      setCategories(categoryList);
      setProfile(profileResult);
      setServiceAreas(profileResult?.serviceAreas?.join(", ") ?? "");
      setBalance(wallet.balance);
      setPurchases(wallet.purchases ?? []);
      setLedger(wallet.ledger ?? []);
      setRefunds(wallet.refunds ?? []);
      setContacts(contactList);
      setPackages(packageList);
      if (packageList[0]) setSelectedPackage(packageList[0].id);
      try {
        const opportunitiesResult = await api<any>("/providers/opportunities");
        setOpportunities(opportunitiesResult.opportunities);
      } catch {
        setOpportunities([]);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar seu painel.",
      );
    }
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const categoryIds = Array.from(
      form.querySelectorAll<HTMLInputElement>(
        'input[name="categoryIds"]:checked',
      ),
    ).map((input) => input.value);
    setError("");
    setNotice("");
    try {
      const updated = await api<any>("/providers/me", {
        method: "PATCH",
        body: JSON.stringify({
          city: values.city,
          bio: values.bio,
          categoryIds,
          serviceAreas: serviceAreas
            .split(",")
            .map((area) => area.trim())
            .filter(Boolean),
          availability: values.availability,
          priceFromCents: values.priceFrom
            ? Math.round(Number(values.priceFrom) * 100)
            : undefined,
          serviceRadiusKm: Number(values.serviceRadiusKm),
          portfolioUrls: String(values.portfolioUrls ?? "")
            .split("\n")
            .map((url) => url.trim())
            .filter(Boolean),
          avatarUrl: String(values.avatarUrl ?? "").trim() || undefined,
          ...(values.latitude && values.longitude
            ? {
                latitude: Number(values.latitude),
                longitude: Number(values.longitude),
              }
            : {}),
          locationConsent: values.locationConsent === "on",
        }),
      });
      setProfile(updated);
      setNotice(
        "Perfil atualizado. Suas oportunidades já estão filtradas por região e categoria.",
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível salvar o perfil.",
      );
    }
  }
  async function unlock(item: RequestItem) {
    if (
      !window.confirm(
        `Desbloquear este contato por ${item.leadCreditCost} créditos? Seu saldo atual é ${balance}.`,
      )
    )
      return;
    setError("");
    try {
      const result = await api<{ unlockId: string }>(
        `/providers/opportunities/${item.id}/unlock`,
        { method: "POST" },
      );
      const contact = await api<Contact>(
        `/providers/opportunities/${item.id}/contact`,
      );
      contact.unlockId = result.unlockId;
      setContacts((current) => [
        contact,
        ...current.filter(
          (existing) => existing.requestId !== contact.requestId,
        ),
      ]);
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível desbloquear este contato.",
      );
    }
  }
  async function purchase(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await api("/wallet/purchases", {
        method: "POST",
        body: JSON.stringify({ packageId: selectedPackage }),
      });
      setNotice(
        "Solicitação registrada. A liberação dos créditos depende da confirmação do pagamento pela equipe.",
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível solicitar a compra.",
      );
    }
  }
  async function requestRefund(contact: Contact) {
    const reason = window.prompt(
      "Descreva por que este contato parece inválido (pedido falso, duplicado ou fora da região).",
    );
    if (!reason) return;
    try {
      await api("/wallet/refund-requests", {
        method: "POST",
        body: JSON.stringify({ unlockId: contact.unlockId, reason }),
      });
      setNotice("Solicitação de análise registrada.");
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível solicitar o estorno.",
      );
    }
  }
  async function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setError("");
    try {
      await api("/providers/me/verification", {
        method: "POST",
        body: JSON.stringify({
          statement: values.statement,
          documentUrls: String(values.documentUrls ?? "")
            .split(/\n|,/)
            .map((url) => url.trim())
            .filter(Boolean),
        }),
      });
      setNotice("Solicitação enviada para análise da equipe.");
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível solicitar a verificação.",
      );
    }
  }
  const profileCategories = new Set(
    profile?.categories.map((item) => item.category.id) ?? [],
  );
  return (
    <main className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">Área do profissional</span>
          <h1>Oportunidades para você</h1>
          <p>Pedidos compatíveis com seu perfil e sua região.</p>
        </div>
        <div className="balance-card">
          <span>Saldo de créditos</span>
          <strong>
            {balance}
            <small> créditos</small>
          </strong>
          <span className="balance-card-note">Créditos e compras abaixo</span>
        </div>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      {notice && <p className="alert alert-success">{notice}</p>}
      <div className="provider-layout">
        <div className="provider-main">
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">Pedidos abertos</span>
                <h2>Novas oportunidades</h2>
              </div>
              <span className="count-pill">{opportunities.length}</span>
            </div>
            {opportunities.length ? (
              <div className="opportunity-list">
                {opportunities.map((item) => (
                  <article className="opportunity" key={item.id}>
                    <div className="opportunity-head">
                      <div className="request-icon">⌂</div>
                      <div>
                        <span className="category-label">
                          {item.category.name}
                        </span>
                        <h3>{item.title}</h3>
                        <p>
                          ⌖ {item.neighborhood}, {item.city}
                        </p>
                      </div>
                      <span className="lead-cost">
                        {item.leadCreditCost} créditos
                      </span>
                    </div>
                    <p className="opportunity-description">
                      {item.description}
                    </p>
                    <div className="opportunity-footer">
                      <span>
                        Publicado em {date(item.createdAt)} ·{" "}
                        {item.unlockedCount ?? 0} de {item.maxUnlocks}{" "}
                        profissionais
                      </span>
                      <button
                        className="button button-dark"
                        onClick={() => void unlock(item)}
                      >
                        Desbloquear contato <span>→</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span>⌕</span>
                <strong>Nenhuma oportunidade por enquanto</strong>
                <p>
                  Complete seu perfil e volte em breve. Novos pedidos aparecem
                  aqui automaticamente.
                </p>
              </div>
            )}
          </section>
          {contacts.length > 0 && (
            <section className="panel contact-panel">
              <div className="panel-head">
                <div>
                  <span className="panel-kicker">Contatos liberados</span>
                  <h2>Fale com o cliente</h2>
                </div>
              </div>
              {contacts.map((contact) => (
                <article className="contact-card" key={contact.requestId}>
                  <div>
                    <span className="category-label">
                      {contact.category} · {contact.neighborhood}
                    </span>
                    <h3>{contact.title}</h3>
                    <p>{contact.customer.name}</p>
                  </div>
                  <div className="contact-actions">
                    {contact.customer.phone && (
                      <a
                        className="button button-green"
                        href={`https://wa.me/${whatsappNumber(contact.customer.phone)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp ↗
                      </a>
                    )}
                    <a href={`mailto:${contact.customer.email}`}>
                      {contact.customer.email}
                    </a>
                    {(() => {
                      const refund = refunds.find(
                        (item) => item.unlockId === contact.unlockId,
                      );
                      return refund ? (
                        <span className="refund-state">
                          {refund.status === "PENDING"
                            ? "Estorno em análise"
                            : refund.status === "APPROVED"
                              ? "Créditos estornados"
                              : "Solicitação não aprovada"}
                        </span>
                      ) : (
                        <button
                          className="text-button refund-button"
                          onClick={() => void requestRefund(contact)}
                        >
                          Solicitar análise do contato
                        </button>
                      );
                    })()}
                  </div>
                  <RequestEngagement
                    api={api}
                    requestId={contact.requestId}
                    requestTitle={contact.title}
                    role="PROVIDER"
                    peers={[
                      { id: contact.customer.id, name: contact.customer.name },
                    ]}
                    onChanged={() => void load()}
                  />
                </article>
              ))}
            </section>
          )}
        </div>
        <aside className="provider-side">
          <section className="panel profile-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">Seu negócio</span>
                <h2>Perfil profissional</h2>
              </div>
              <span className="profile-dot" />
            </div>
            <form
              key={profile?.id ?? "provider-profile-form"}
              className="stack-form"
              onSubmit={saveProfile}
            >
              <label>
                Cidade principal
                <input
                  name="city"
                  required
                  minLength={2}
                  defaultValue={profile?.city ?? ""}
                  placeholder="Ex.: Campinas"
                />
              </label>
              <label>
                Outras regiões atendidas
                <input
                  value={serviceAreas}
                  onChange={(e) => setServiceAreas(e.target.value)}
                  placeholder="Bairros ou cidades, separados por vírgula"
                />
              </label>
              <label>
                Sobre seu trabalho
                <textarea
                  name="bio"
                  rows={3}
                  maxLength={2000}
                  defaultValue={profile?.bio ?? ""}
                  placeholder="Conte sua experiência e o que você oferece"
                />
              </label>
              <label>
                Disponibilidade
                <input
                  name="availability"
                  maxLength={120}
                  defaultValue={
                    profile?.availability ?? "Disponível para novos serviços"
                  }
                  placeholder="Ex.: Atendo de segunda a sábado"
                />
              </label>
              <div className="field-row">
                <label>
                  A partir de (R$)
                  <input
                    name="priceFrom"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={
                      profile?.priceFromCents
                        ? (profile.priceFromCents / 100).toFixed(2)
                        : ""
                    }
                    placeholder="Opcional"
                  />
                </label>
                <label>
                  Raio de atendimento
                  <input
                    name="serviceRadiusKm"
                    type="number"
                    min="1"
                    max="100"
                    defaultValue={profile?.serviceRadiusKm ?? 15}
                  />
                </label>
              </div>
              <label>
                Foto de perfil (URL)
                <input
                  name="avatarUrl"
                  type="url"
                  defaultValue={profile?.avatarUrl ?? ""}
                  placeholder="https://..."
                />
              </label>
              <label>
                Portfólio (uma imagem por linha)
                <textarea
                  name="portfolioUrls"
                  rows={3}
                  defaultValue={profile?.portfolioUrls.join("\n") ?? ""}
                  placeholder="https://..."
                />
              </label>
              <div className="field-row">
                <label>
                  Latitude aproximada
                  <input
                    name="latitude"
                    type="number"
                    min="-90"
                    max="90"
                    step="0.000001"
                    defaultValue={profile?.latitude ?? ""}
                  />
                </label>
                <label>
                  Longitude aproximada
                  <input
                    name="longitude"
                    type="number"
                    min="-180"
                    max="180"
                    step="0.000001"
                    defaultValue={profile?.longitude ?? ""}
                  />
                </label>
              </div>
              <label className="consent-check">
                <input
                  name="locationConsent"
                  type="checkbox"
                  defaultChecked={!!profile?.latitude && !!profile?.longitude}
                />
                <span>
                  Autorizo mostrar somente minha região aproximada no mapa,
                  nunca o endereço exato.
                </span>
              </label>
              <fieldset className="category-checks">
                <legend>Serviços que oferece</legend>
                {categories.map((item) => (
                  <label key={item.id}>
                    <input
                      type="checkbox"
                      name="categoryIds"
                      value={item.id}
                      defaultChecked={profileCategories.has(item.id)}
                    />
                    <span>{item.name}</span>
                  </label>
                ))}
              </fieldset>
              <button className="button button-dark full-width">
                Salvar meu perfil
              </button>
            </form>
          </section>
          <section className="panel verification-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">Confiança</span>
                <h2>Verificação do perfil</h2>
              </div>
              <span
                className={`verification-badge verification-${profile?.verificationStatus.toLowerCase()}`}
              >
                {profile?.verificationStatus === "VERIFIED"
                  ? "Verificado"
                  : profile?.verificationStatus === "PENDING"
                    ? "Em análise"
                    : "Opcional"}
              </span>
            </div>
            {profile?.verificationStatus === "VERIFIED" ? (
              <p className="form-note">
                Seu perfil possui selo de verificação e aparece com mais
                contexto para os clientes.
              </p>
            ) : (
              <form className="stack-form" onSubmit={submitVerification}>
                <label>
                  Contexto para a equipe
                  <textarea
                    name="statement"
                    required
                    minLength={12}
                    maxLength={1000}
                    rows={3}
                    defaultValue={
                      profile?.verificationStatus === "REJECTED"
                        ? (profile.verificationNote ?? "")
                        : ""
                    }
                    placeholder="Informe seu nome profissional, experiência e como podemos validar seu serviço."
                  />
                </label>
                <label>
                  Links de documentos ou certificados (opcional)
                  <textarea
                    name="documentUrls"
                    rows={2}
                    defaultValue={
                      profile?.verificationDocumentUrls.join("\n") ?? ""
                    }
                    placeholder="Um link seguro por linha"
                  />
                </label>
                <small className="form-note">
                  Estes links ficam restritos à equipe de verificação e não são
                  exibidos no seu perfil público.
                </small>
                <button className="button button-light full-width">
                  Solicitar verificação
                </button>
              </form>
            )}
          </section>
          <section className="panel wallet-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">Mais oportunidades</span>
                <h2>Adicionar créditos</h2>
              </div>
              <span className="wallet-icon">◈</span>
            </div>
            {packages.length ? (
              <form className="stack-form" onSubmit={purchase}>
                <label>
                  Escolha um pacote
                  <select
                    value={selectedPackage}
                    onChange={(event) => setSelectedPackage(event.target.value)}
                  >
                    {packages.map((bundle) => (
                      <option key={bundle.id} value={bundle.id}>
                        {bundle.name} · {bundle.credits} créditos ·{" "}
                        {money(bundle.amountInCents)}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button button-green full-width">
                  Solicitar compra
                </button>
                <small className="form-note">
                  Os créditos são adicionados após confirmação do pagamento pela
                  equipe.
                </small>
              </form>
            ) : (
              <div className="empty-compact">
                <p>Os pacotes de créditos serão disponibilizados em breve.</p>
              </div>
            )}
            {purchases.length > 0 && (
              <div className="credit-ledger">
                <strong>Minhas solicitações de compra</strong>
                {purchases.slice(0, 4).map((purchase) => (
                  <div key={purchase.id}>
                    <span>
                      {purchase.credits} créditos ·{" "}
                      {money(purchase.amountInCents)}
                      <small>
                        {purchase.status === "PENDING"
                          ? "Aguardando confirmação"
                          : purchase.status === "APPROVED"
                            ? "Aprovada"
                            : "Rejeitada"}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {ledger.length > 0 && (
              <div className="credit-ledger">
                <strong>Movimentações recentes</strong>
                {ledger.slice(0, 5).map((entry) => (
                  <div key={entry.id}>
                    <span>
                      {entry.description}
                      <small>{date(entry.createdAt)}</small>
                    </span>
                    <b className={entry.amount > 0 ? "credit-positive" : ""}>
                      {entry.amount > 0 ? "+" : ""}
                      {entry.amount}
                    </b>
                  </div>
                ))}
              </div>
            )}
            {refunds.length > 0 && (
              <div className="credit-ledger">
                <strong>Solicitações de análise</strong>
                {refunds.slice(0, 4).map((refund) => (
                  <div key={refund.id}>
                    <span>
                      {refund.unlock.request.title}
                      <small>
                        {refund.status === "PENDING"
                          ? "Em análise"
                          : refund.status === "APPROVED"
                            ? "Aprovada"
                            : "Não aprovada"}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

type AdminReviewDialog = {
  path: string;
  title: string;
  description: string;
  success: string;
  submitLabel: string;
  initialNote: string;
  body: (note: string) => unknown;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AdminDashboard({
  api,
  section,
}: {
  api: ApiCall;
  section: AdminSection;
}) {
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [purchases, setPurchases] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [decision, setDecision] = useState<AdminReviewDialog | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        stats,
        purchaseList,
        refundList,
        reportList,
        verificationList,
        categoryList,
        packageList,
        activityList,
      ] = await Promise.all([
        api<any>("/admin/summary"),
        api<any[]>("/admin/credit-purchases/pending"),
        api<any[]>("/admin/refund-requests/pending"),
        api<any[]>("/admin/reports"),
        api<any[]>("/admin/provider-verifications"),
        api<any[]>("/admin/categories"),
        api<any[]>("/admin/credit-packages"),
        api<any[]>("/admin/activity"),
      ]);
      setSummary(stats);
      setPurchases(purchaseList);
      setRefunds(refundList);
      setReports(reportList);
      setVerifications(verificationList);
      setCategories(categoryList);
      setPackages(packageList);
      setActivity(activityList);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível carregar o painel.",
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(
    path: string,
    init: RequestInit,
    message: string,
    key = path,
  ): Promise<boolean> {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusyAction(key);
    setError("");
    setNotice("");
    try {
      await api(path, init);
      setNotice(message);
      setDecision(null);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      return false;
    } finally {
      busyRef.current = false;
      setBusyAction(null);
    }
  }

  async function create(
    event: FormEvent<HTMLFormElement>,
    path: string,
    transform: (values: Record<string, FormDataEntryValue>) => unknown,
    message: string,
    onSuccess?: () => void,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const created = await runAction(
      path,
      { method: "POST", body: JSON.stringify(transform(values)) },
      message,
    );
    if (created) {
      form.reset();
      onSuccess?.();
    }
  }

  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision) return;
    const note = String(new FormData(event.currentTarget).get("note") ?? "");
    await runAction(
      decision.path,
      { method: "POST", body: JSON.stringify(decision.body(note.trim())) },
      decision.success,
    );
  }

  const stats = [
    { label: "Clientes", value: summary.customers, detail: "contas ativas" },
    {
      label: "Profissionais",
      value: summary.providers,
      detail: "prestadores ativos",
    },
    {
      label: "Pedidos",
      value: summary.requests,
      detail: "solicitações criadas",
    },
    {
      label: "Pedidos abertos",
      value: summary.openRequests,
      detail: "aguardando profissionais",
    },
    {
      label: "Compras pendentes",
      value: summary.pendingPurchases,
      detail: "precisam de análise",
    },
    {
      label: "Créditos em circulação",
      value: summary.creditsInCirculation,
      detail: "saldo dos profissionais",
    },
    {
      label: "Denúncias abertas",
      value: summary.openReports,
      detail: "precisam de moderação",
    },
    {
      label: "Verificações",
      value: summary.pendingVerifications,
      detail: "perfis em análise",
    },
  ];

  return (
    <main
      className="dashboard-page admin-dashboard"
      data-admin-section={section}
    >
      <div className="admin-overview" data-admin-route="overview">
        <div>
          <span className="eyebrow">Painel de controle · TPServiços</span>
          <h1>Visão geral da plataforma</h1>
          <p>Gerencie o catálogo, acompanhe pagamentos e cuide da qualidade.</p>
        </div>
        <button
          className="button button-light admin-refresh"
          onClick={() => void load()}
          disabled={loading || Boolean(busyAction)}
          aria-label="Atualizar dados do painel"
        >
          <span aria-hidden="true">↻</span>
          {loading ? "Atualizando…" : "Atualizar dados"}
        </button>
      </div>

      {(error || notice) && (
        <div
          className={`alert ${error ? "alert-error" : "alert-success"}`}
          role={error ? "alert" : "status"}
          aria-live="polite"
        >
          <span>{error || notice}</span>
          <button
            type="button"
            className="alert-dismiss"
            aria-label="Fechar aviso"
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            ×
          </button>
        </div>
      )}

      <section
        className="stats-grid admin-stats"
        aria-label="Indicadores"
        data-admin-route="overview"
      >
        {stats.map((stat) => (
          <article className="stat-card admin-stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>
              {loading && Object.keys(summary).length === 0
                ? "—"
                : (stat.value ?? 0).toLocaleString("pt-BR")}
            </strong>
            <small>{stat.detail}</small>
          </article>
        ))}
      </section>

      <section
        className="panel admin-panel admin-activity"
        data-admin-route="activity"
      >
        <div className="panel-head">
          <div>
            <span className="panel-kicker">Rastreabilidade</span>
            <h2>Atividade recente</h2>
            <p className="panel-description">
              Decisões críticas de contratação, créditos e confiança ficam
              registradas aqui.
            </p>
          </div>
          <span className="count-pill">{activity.length}</span>
        </div>
        {activity.length ? (
          <div className="activity-list">
            {activity.slice(0, 8).map((event) => (
              <article key={event.id}>
                <span aria-hidden="true">⌁</span>
                <div>
                  <strong>{String(event.action).replaceAll("_", " ")}</strong>
                  <p>
                    {event.actor?.name ?? "Sistema"} · {event.entityType}
                  </p>
                </div>
                <time dateTime={event.createdAt}>{date(event.createdAt)}</time>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-list-empty">
            As decisões operacionais aparecerão aqui conforme a plataforma for
            usada.
          </p>
        )}
      </section>

      <div className="admin-grid">
        <section className="panel admin-panel" data-admin-route="purchases">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">Carteira</span>
              <h2>Compras aguardando confirmação</h2>
              <p className="panel-description">
                Confira o pagamento antes de liberar os créditos.
              </p>
            </div>
            <span
              className="count-pill"
              aria-label={`${purchases.length} compras pendentes`}
            >
              {purchases.length}
            </span>
          </div>
          {purchases.length ? (
            <div className="admin-rows">
              {purchases.map((purchase) => (
                <article className="admin-row" key={purchase.id}>
                  <div className="admin-row-content">
                    <strong>{purchase.provider.name}</strong>
                    <p>
                      {purchase.package?.name ?? "Pacote"} · {purchase.credits}{" "}
                      créditos · {money(purchase.amountInCents)}
                    </p>
                    <small>
                      {purchase.provider.email} · {date(purchase.createdAt)}
                    </small>
                  </div>
                  <div className="row-actions">
                    <button
                      className="button button-green"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        void runAction(
                          `/admin/credit-purchases/${purchase.id}/approve`,
                          { method: "POST", body: JSON.stringify({}) },
                          "Compra aprovada e créditos adicionados.",
                        )
                      }
                    >
                      {busyAction ===
                      `/admin/credit-purchases/${purchase.id}/approve`
                        ? "Confirmando…"
                        : "Confirmar compra"}
                    </button>
                    <button
                      className="button button-outline-danger"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        setDecision({
                          path: `/admin/credit-purchases/${purchase.id}/reject`,
                          title: "Rejeitar compra",
                          description: `Informe o motivo para rejeitar a compra de ${purchase.provider.name}.`,
                          success: "Compra rejeitada.",
                          submitLabel: "Rejeitar compra",
                          initialNote: "",
                          body: (note) => ({ note }),
                        })
                      }
                    >
                      Rejeitar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              <span className="admin-empty-icon" aria-hidden="true">
                ✓
              </span>
              <strong>{loading ? "Carregando compras" : "Tudo em dia"}</strong>
              <p>
                {loading
                  ? "Buscando compras pendentes…"
                  : "As compras que precisarem de confirmação aparecerão aqui."}
              </p>
            </div>
          )}
        </section>

        <section className="panel admin-panel" data-admin-route="refunds">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">Qualidade</span>
              <h2>Solicitações de estorno</h2>
              <p className="panel-description">
                Analise os motivos e registre a decisão para cada pedido.
              </p>
            </div>
            <span
              className="count-pill"
              aria-label={`${refunds.length} estornos pendentes`}
            >
              {refunds.length}
            </span>
          </div>
          {refunds.length ? (
            <div className="admin-rows">
              {refunds.map((refund) => (
                <article className="admin-row" key={refund.id}>
                  <div className="admin-row-content">
                    <strong>{refund.provider.name}</strong>
                    <p className="admin-row-subtitle">
                      Pedido: {refund.unlock.request.title}
                    </p>
                    <p>{refund.reason}</p>
                    <small>
                      {date(refund.createdAt)} · {refund.unlock.creditsCharged}{" "}
                      créditos
                    </small>
                  </div>
                  <div className="row-actions">
                    <button
                      className="button button-green"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        setDecision({
                          path: `/admin/refund-requests/${refund.id}/decision`,
                          title: "Aprovar estorno",
                          description: `A aprovação devolverá ${refund.unlock.creditsCharged} créditos para ${refund.provider.name}.`,
                          success: "Estorno aprovado e créditos devolvidos.",
                          submitLabel: "Aprovar estorno",
                          initialNote:
                            "Oportunidade inválida; créditos devolvidos.",
                          body: (note) => ({ decision: "APPROVED", note }),
                        })
                      }
                    >
                      Aprovar
                    </button>
                    <button
                      className="button button-outline-danger"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        setDecision({
                          path: `/admin/refund-requests/${refund.id}/decision`,
                          title: "Rejeitar estorno",
                          description:
                            "Registre uma justificativa para a decisão.",
                          success: "Solicitação de estorno rejeitada.",
                          submitLabel: "Rejeitar estorno",
                          initialNote: "",
                          body: (note) => ({ decision: "REJECTED", note }),
                        })
                      }
                    >
                      Rejeitar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              <span className="admin-empty-icon" aria-hidden="true">
                ✓
              </span>
              <strong>
                {loading ? "Carregando solicitações" : "Sem estornos pendentes"}
              </strong>
              <p>
                {loading
                  ? "Buscando solicitações…"
                  : "Novas solicitações de estorno aparecerão aqui para análise."}
              </p>
            </div>
          )}
        </section>

        <section className="panel admin-panel" data-admin-route="verifications">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">Confiança</span>
              <h2>Verificações de profissionais</h2>
              <p className="panel-description">
                Revise solicitações completas e entregue o selo apenas quando
                houver contexto suficiente.
              </p>
            </div>
            <span className="count-pill">{verifications.length}</span>
          </div>
          {verifications.length ? (
            <div className="admin-rows">
              {verifications.map((verification) => (
                <article className="admin-row" key={verification.id}>
                  <div className="admin-row-content">
                    <strong>{verification.user.name}</strong>
                    <p className="admin-row-subtitle">
                      {verification.city} ·{" "}
                      {verification.categories
                        .map((item: any) => item.category.name)
                        .join(", ")}
                    </p>
                    <p>{verification.verificationNote}</p>
                    {!!verification.verificationDocumentUrls?.length && (
                      <div className="verification-documents">
                        {verification.verificationDocumentUrls.map(
                          (url: string, index: number) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Documento {index + 1} ↗
                            </a>
                          ),
                        )}
                      </div>
                    )}
                    <small>{verification.user.email}</small>
                  </div>
                  <div className="row-actions">
                    <button
                      className="button button-green"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        setDecision({
                          path: `/admin/provider-verifications/${verification.id}/decision`,
                          title: "Verificar perfil",
                          description: `Confirme a verificação do perfil de ${verification.user.name}.`,
                          success:
                            "Perfil verificado e profissional notificado.",
                          submitLabel: "Confirmar verificação",
                          initialNote:
                            "Perfil revisado e aprovado pela equipe.",
                          body: (note) => ({ decision: "VERIFIED", note }),
                        })
                      }
                    >
                      Verificar
                    </button>
                    <button
                      className="button button-outline-danger"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        setDecision({
                          path: `/admin/provider-verifications/${verification.id}/decision`,
                          title: "Solicitar ajustes",
                          description:
                            "Explique ao profissional o que precisa ser ajustado para uma nova análise.",
                          success: "Solicitação devolvida ao profissional.",
                          submitLabel: "Enviar orientações",
                          initialNote: "",
                          body: (note) => ({ decision: "REJECTED", note }),
                        })
                      }
                    >
                      Solicitar ajustes
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              <span className="admin-empty-icon" aria-hidden="true">
                ✓
              </span>
              <strong>Sem verificações pendentes</strong>
              <p>
                As solicitações enviadas pelos profissionais aparecerão aqui.
              </p>
            </div>
          )}
        </section>

        <section className="panel admin-panel" data-admin-route="reports">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">Segurança</span>
              <h2>Denúncias e moderação</h2>
              <p className="panel-description">
                Registre decisões para manter a comunidade segura e auditável.
              </p>
            </div>
            <span className="count-pill">{reports.length}</span>
          </div>
          {reports.length ? (
            <div className="admin-rows">
              {reports.map((report) => (
                <article className="admin-row" key={report.id}>
                  <div className="admin-row-content">
                    <strong>{report.reason}</strong>
                    <p className="admin-row-subtitle">
                      {report.targetType} · {report.author.name}
                    </p>
                    {report.details && <p>{report.details}</p>}
                    <small>{date(report.createdAt)}</small>
                  </div>
                  <div className="row-actions">
                    <button
                      className="button button-green"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        setDecision({
                          path: `/admin/reports/${report.id}/decision`,
                          title: "Resolver denúncia",
                          description:
                            "Descreva a ação ou o encaminhamento realizado.",
                          success: "Denúncia marcada como resolvida.",
                          submitLabel: "Concluir revisão",
                          initialNote: "Revisão concluída pela equipe.",
                          body: (note) => ({ decision: "RESOLVED", note }),
                        })
                      }
                    >
                      Resolver
                    </button>
                    <button
                      className="button button-light"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        setDecision({
                          path: `/admin/reports/${report.id}/decision`,
                          title: "Dispensar denúncia",
                          description:
                            "Registre por que a denúncia não exige ação adicional.",
                          success: "Denúncia dispensada com registro.",
                          submitLabel: "Dispensar denúncia",
                          initialNote: "",
                          body: (note) => ({ decision: "DISMISSED", note }),
                        })
                      }
                    >
                      Dispensar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              <span className="admin-empty-icon" aria-hidden="true">
                ✓
              </span>
              <strong>Nenhuma denúncia pendente</strong>
              <p>Novos relatos aparecem aqui para análise da equipe.</p>
            </div>
          )}
        </section>

        <section className="panel admin-panel" data-admin-route="categories">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">Catálogo</span>
              <h2>Categorias e custo por oportunidade</h2>
              <p className="panel-description">
                Defina quantos créditos são cobrados para liberar cada contato.
              </p>
            </div>
            <span
              className="count-pill"
              aria-label={`${categories.length} categorias`}
            >
              {categories.length}
            </span>
          </div>
          <div className="admin-category-list">
            {categories.map((category) => (
              <form
                className="admin-inline"
                key={category.id}
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = Number(
                    new FormData(event.currentTarget).get("leadCost"),
                  );
                  void runAction(
                    `/admin/categories/${category.id}`,
                    {
                      method: "PATCH",
                      body: JSON.stringify({ leadCost: value }),
                    },
                    `Custo de “${category.name}” atualizado.`,
                    `category:${category.id}`,
                  );
                }}
              >
                <div className="admin-category-name">
                  <strong>{category.name}</strong>
                  <small>
                    {category.active === false ? "Inativa" : "Ativa"}
                  </small>
                </div>
                <label className="admin-cost-field">
                  <span>Custo</span>
                  <input
                    name="leadCost"
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    required
                    defaultValue={category.leadCost}
                    aria-label={`Custo em créditos para ${category.name}`}
                  />
                  <small>créditos</small>
                </label>
                <button
                  className="button button-light admin-save"
                  disabled={Boolean(busyAction)}
                >
                  {busyAction === `category:${category.id}`
                    ? "Salvando…"
                    : "Salvar"}
                </button>
              </form>
            ))}
            {!categories.length && !loading && (
              <p className="admin-list-empty">Nenhuma categoria cadastrada.</p>
            )}
          </div>
          <form
            className="admin-create admin-create-category"
            onSubmit={(event) =>
              void create(
                event,
                "/admin/categories",
                (values) => ({
                  name: String(values.name).trim(),
                  slug: String(values.slug).trim(),
                  leadCost: Number(values.leadCost),
                }),
                "Categoria adicionada ao catálogo.",
                () => {
                  setNewCategoryName("");
                  setNewCategorySlug("");
                },
              )
            }
          >
            <div className="admin-form-intro">
              <strong>Adicionar categoria</strong>
              <span>O identificador é preenchido automaticamente.</span>
            </div>
            <div className="admin-form-fields">
              <label>
                <span>Nome da categoria</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Ex.: Jardinagem"
                  value={newCategoryName}
                  onChange={(event) => {
                    const nextName = event.currentTarget.value;
                    setNewCategoryName(nextName);
                    setNewCategorySlug(slugify(nextName));
                  }}
                />
              </label>
              <label>
                <span>Identificador</span>
                <input
                  name="slug"
                  required
                  minLength={2}
                  maxLength={120}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  title="Use letras minúsculas, números e hífens."
                  placeholder="jardinagem"
                  value={newCategorySlug}
                  onChange={(event) =>
                    setNewCategorySlug(event.currentTarget.value)
                  }
                />
              </label>
              <label>
                <span>Custo em créditos</span>
                <input
                  name="leadCost"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  required
                  defaultValue="5"
                />
              </label>
              <button
                className="button button-dark"
                disabled={Boolean(busyAction)}
              >
                {busyAction === "/admin/categories"
                  ? "Adicionando…"
                  : "Adicionar categoria"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel admin-panel" data-admin-route="packages">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">Monetização</span>
              <h2>Pacotes de créditos</h2>
              <p className="panel-description">
                Crie opções de compra e controle quais ficam disponíveis.
              </p>
            </div>
            <span
              className="count-pill"
              aria-label={`${packages.length} pacotes`}
            >
              {packages.length}
            </span>
          </div>
          <div className="admin-package-list">
            {packages.map((bundle) => (
              <article className="admin-package-row" key={bundle.id}>
                <div className="admin-package-name">
                  <strong>{bundle.name}</strong>
                  <span>{bundle.credits.toLocaleString("pt-BR")} créditos</span>
                </div>
                <strong className="admin-package-price">
                  {money(bundle.amountInCents)}
                </strong>
                <span
                  className={`admin-status ${bundle.active ? "is-active" : "is-inactive"}`}
                >
                  {bundle.active ? "Disponível" : "Pausado"}
                </span>
                <button
                  className="button button-light admin-toggle"
                  disabled={Boolean(busyAction)}
                  onClick={() =>
                    void runAction(
                      `/admin/credit-packages/${bundle.id}`,
                      {
                        method: "PATCH",
                        body: JSON.stringify({ active: !bundle.active }),
                      },
                      bundle.active ? "Pacote pausado." : "Pacote ativado.",
                      `package:${bundle.id}`,
                    )
                  }
                >
                  {busyAction === `package:${bundle.id}`
                    ? "Salvando…"
                    : bundle.active
                      ? "Pausar pacote"
                      : "Ativar pacote"}
                </button>
              </article>
            ))}
            {!packages.length && !loading && (
              <p className="admin-list-empty">
                Nenhum pacote cadastrado. Adicione o primeiro abaixo.
              </p>
            )}
          </div>
          <form
            className="admin-create admin-create-package"
            onSubmit={(event) =>
              void create(
                event,
                "/admin/credit-packages",
                (values) => ({
                  name: String(values.name).trim(),
                  credits: Number(values.credits),
                  amountInCents: Math.round(Number(values.price) * 100),
                }),
                "Pacote de créditos adicionado.",
              )
            }
          >
            <div className="admin-form-intro">
              <strong>Criar pacote</strong>
              <span>O pacote fica disponível para os profissionais.</span>
            </div>
            <div className="admin-form-fields">
              <label>
                <span>Nome do pacote</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Ex.: Essencial"
                />
              </label>
              <label>
                <span>Quantidade de créditos</span>
                <input
                  name="credits"
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  required
                  placeholder="50"
                />
              </label>
              <label>
                <span>Preço em reais</span>
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  required
                  placeholder="49,90"
                />
              </label>
              <button
                className="button button-dark"
                disabled={Boolean(busyAction)}
              >
                {busyAction === "/admin/credit-packages"
                  ? "Criando…"
                  : "Criar pacote"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <AdminUsers api={api} />
      <AdminAdvertising api={api} />

      {decision && (
        <div className="admin-dialog-backdrop">
          <section
            className="admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-dialog-title"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busyAction) setDecision(null);
            }}
          >
            <button
              className="admin-dialog-close"
              type="button"
              aria-label="Fechar"
              onClick={() => setDecision(null)}
              disabled={Boolean(busyAction)}
            >
              ×
            </button>
            <span className="panel-kicker">Revisão administrativa</span>
            <h2 id="admin-dialog-title">{decision.title}</h2>
            <p>{decision.description}</p>
            <form onSubmit={(event) => void submitDecision(event)}>
              <label htmlFor="admin-decision-note">Justificativa</label>
              <textarea
                id="admin-decision-note"
                name="note"
                required
                minLength={3}
                maxLength={500}
                rows={4}
                autoFocus
                defaultValue={decision.initialNote}
                placeholder="Escreva uma justificativa (mínimo de 3 caracteres)"
              />
              <div className="admin-dialog-actions">
                <button
                  type="button"
                  className="button button-light"
                  onClick={() => setDecision(null)}
                  disabled={Boolean(busyAction)}
                >
                  Cancelar
                </button>
                <button
                  className="button button-dark"
                  disabled={Boolean(busyAction)}
                >
                  {busyAction ? "Salvando…" : decision.submitLabel}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  active: boolean;
  createdAt: string;
  provider: { city: string; verifiedAt: string | null } | null;
};

function AdminUsers({ api }: { api: ApiCall }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const roleLabel = (role: Role) =>
    ({ CUSTOMER: "Cliente", PROVIDER: "Profissional", ADMIN: "Administrador" })[
      role
    ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await api<AdminUser[]>("/admin/users"));
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar os usuários.",
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const password = String(values.password ?? "");
    if (password !== String(values.passwordConfirmation ?? "")) {
      setNotice("");
      setError("As senhas informadas precisam ser iguais.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: String(values.name ?? "").trim(),
          email: String(values.email ?? "").trim(),
          phone: String(values.phone ?? "").trim() || undefined,
          role: values.role,
          password,
        }),
      });
      form.reset();
      setNotice("Usuário criado. A senha foi armazenada com segurança.");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar o usuário.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="panel admin-panel admin-users-panel"
      data-admin-route="users"
    >
      <div className="panel-head">
        <div>
          <span className="panel-kicker">Acesso à plataforma</span>
          <h2>Usuários</h2>
          <p className="panel-description">
            Crie contas de clientes e profissionais. Senhas nunca são exibidas
            depois do cadastro.
          </p>
        </div>
        <span
          className="count-pill"
          aria-label={`${users.length} usuários recentes`}
        >
          {loading ? "…" : users.length}
        </span>
      </div>

      {(error || notice) && (
        <p
          className={`alert ${error ? "alert-error" : "alert-success"} admin-users-alert`}
          role={error ? "alert" : "status"}
          aria-live="polite"
        >
          {error || notice}
        </p>
      )}

      <div className="admin-users-layout">
        <div className="admin-user-list" aria-busy={loading}>
          {users.map((user) => (
            <article className="admin-user-row" key={user.id}>
              <span className="admin-user-avatar" aria-hidden="true">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="admin-user-data">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
                <small>
                  {roleLabel(user.role)} · Criado em {date(user.createdAt)}
                  {user.provider?.city ? ` · ${user.provider.city}` : ""}
                </small>
              </div>
              <span
                className={`admin-role admin-role-${user.role.toLowerCase()}`}
              >
                {roleLabel(user.role)}
              </span>
            </article>
          ))}
          {!loading && !users.length && (
            <div className="admin-empty">
              <span className="admin-empty-icon" aria-hidden="true">
                ⌁
              </span>
              <strong>Nenhum usuário encontrado</strong>
              <p>As novas contas aparecerão aqui depois do cadastro.</p>
            </div>
          )}
        </div>

        <form
          className="admin-create admin-user-create"
          onSubmit={(event) => void createUser(event)}
        >
          <div className="admin-form-intro">
            <strong>Criar usuário</strong>
            <span>
              Defina o acesso inicial e comunique a senha ao titular por canal
              seguro.
            </span>
          </div>
          <div className="admin-form-fields">
            <label>
              <span>Nome completo</span>
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                placeholder="Nome da pessoa"
              />
            </label>
            <label>
              <span>E-mail</span>
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder="nome@empresa.com"
              />
            </label>
            <label>
              <span>Telefone (opcional)</span>
              <input
                name="phone"
                type="tel"
                minLength={10}
                maxLength={30}
                autoComplete="tel"
                placeholder="(11) 99999-9999"
              />
            </label>
            <label>
              <span>Tipo de conta</span>
              <select name="role" defaultValue="CUSTOMER">
                <option value="CUSTOMER">Cliente</option>
                <option value="PROVIDER">Profissional</option>
              </select>
            </label>
            <label>
              <span>Senha inicial</span>
              <input
                name="password"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Mínimo de 10 caracteres"
              />
            </label>
            <label>
              <span>Confirmar senha</span>
              <input
                name="passwordConfirmation"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Repita a senha"
              />
            </label>
            <p className="password-hint">
              Use ao menos uma letra maiúscula, uma minúscula e um número.
            </p>
            <button className="button button-dark" disabled={busy}>
              {busy ? "Criando usuário…" : "Criar usuário"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function AdminAdvertising({ api }: { api: ApiCall }) {
  const [plans, setPlans] = useState<AdvertisingPlan[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [decision, setDecision] = useState<AdminReviewDialog | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [planList, requestList] = await Promise.all([
        api<AdvertisingPlan[]>("/admin/advertising/packages"),
        api<any[]>("/admin/advertising/requests/pending"),
      ]);
      setPlans(planList);
      setRequests(requestList);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar a publicidade.",
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(
    path: string,
    init: RequestInit,
    success: string,
  ): Promise<boolean> {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, init);
      setNotice(success);
      setDecision(null);
      await load();
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir a operação.",
      );
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const created = await mutate(
      "/admin/advertising/packages",
      {
        method: "POST",
        body: JSON.stringify({
          name: String(values.name).trim(),
          description: String(values.description ?? "").trim(),
          durationDays: Number(values.durationDays),
          amountInCents: Math.round(Number(values.price) * 100),
        }),
      },
      "Plano de publicidade publicado.",
    );
    if (created) form.reset();
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision) return;
    const note = String(new FormData(event.currentTarget).get("note") ?? "");
    await mutate(
      decision.path,
      { method: "POST", body: JSON.stringify(decision.body(note.trim())) },
      decision.success,
    );
  }

  return (
    <>
      {(error || notice) && (
        <div
          className={`alert ${error ? "alert-error" : "alert-success"}`}
          role={error ? "alert" : "status"}
          aria-live="polite"
        >
          <span>{error || notice}</span>
          <button
            className="alert-dismiss"
            type="button"
            aria-label="Fechar aviso"
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            ×
          </button>
        </div>
      )}
      <div className="admin-grid admin-advertising-grid" id="admin-advertising">
        <section className="panel admin-panel" data-admin-route="advertising">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">Publicidade · Pagamentos</span>
              <h2>Pedidos de anúncio</h2>
              <p className="panel-description">
                Confirme o recebimento do pagamento e revise a marca antes de
                publicar.
              </p>
            </div>
            <span
              className="count-pill"
              aria-label={`${requests.length} pedidos pendentes`}
            >
              {requests.length}
            </span>
          </div>
          {requests.length ? (
            <div className="admin-rows">
              {requests.map((request) => (
                <article
                  className="admin-row admin-ad-request"
                  key={request.id}
                >
                  <div className="admin-row-content">
                    <div className="admin-ad-request-heading">
                      <strong>{request.companyName}</strong>
                      <span className="admin-status is-pending">
                        Aguardando pagamento
                      </span>
                    </div>
                    <p>
                      {request.package.name} · {request.package.durationDays}{" "}
                      dias · {money(request.amountInCents)}
                    </p>
                    <p>
                      {request.category} · {request.city}
                    </p>
                    <small>
                      {request.contactName} · {request.contactEmail} ·{" "}
                      {request.contactPhone}
                    </small>
                    {request.websiteUrl && (
                      <a
                        className="admin-ad-link"
                        href={request.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Abrir site da empresa ↗
                      </a>
                    )}
                  </div>
                  <div className="row-actions">
                    <button
                      className="button button-green"
                      disabled={busy}
                      onClick={() =>
                        setDecision({
                          path: `/admin/advertising/requests/${request.id}/approve`,
                          title: "Confirmar pagamento e publicar",
                          description: `Confirme que ${money(request.amountInCents)} foi recebido de ${request.companyName}. O anúncio ficará no ar por ${request.package.durationDays} dias.`,
                          success: "Pagamento confirmado e anúncio publicado.",
                          submitLabel: "Confirmar e publicar",
                          initialNote:
                            "Pagamento recebido; marca e conteúdo revisados.",
                          body: (note) => ({ note }),
                        })
                      }
                    >
                      Confirmar pagamento
                    </button>
                    <button
                      className="button button-outline-danger"
                      disabled={busy}
                      onClick={() =>
                        setDecision({
                          path: `/admin/advertising/requests/${request.id}/reject`,
                          title: "Recusar anúncio",
                          description: `Informe o motivo da recusa para ${request.companyName}.`,
                          success: "Pedido de anúncio recusado.",
                          submitLabel: "Recusar anúncio",
                          initialNote: "",
                          body: (note) => ({ note }),
                        })
                      }
                    >
                      Recusar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              <span className="admin-empty-icon" aria-hidden="true">
                ✦
              </span>
              <strong>
                {loading ? "Carregando pedidos" : "Nenhum pedido pendente"}
              </strong>
              <p>
                {loading
                  ? "Buscando solicitações de anúncio…"
                  : "Novas solicitações de divulgação aparecerão aqui."}
              </p>
            </div>
          )}
        </section>

        <section className="panel admin-panel" data-admin-route="advertising">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">Publicidade · Planos</span>
              <h2>Planos de divulgação</h2>
              <p className="panel-description">
                Configure os preços e a duração dos espaços patrocinados.
              </p>
            </div>
            <span
              className="count-pill"
              aria-label={`${plans.length} planos de anúncio`}
            >
              {plans.length}
            </span>
          </div>
          <div className="admin-package-list">
            {plans.map((plan) => (
              <article
                className="admin-package-row admin-ad-plan-row"
                key={plan.id}
              >
                <div className="admin-package-name">
                  <strong>{plan.name}</strong>
                  <span>{plan.durationDays} dias de divulgação</span>
                </div>
                <strong className="admin-package-price">
                  {money(plan.amountInCents)}
                </strong>
                <span
                  className={`admin-status ${plan.active ? "is-active" : "is-inactive"}`}
                >
                  {plan.active ? "Disponível" : "Pausado"}
                </span>
                <button
                  className="button button-light admin-toggle"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      `/admin/advertising/packages/${plan.id}`,
                      {
                        method: "PATCH",
                        body: JSON.stringify({ active: !plan.active }),
                      },
                      plan.active ? "Plano pausado." : "Plano disponibilizado.",
                    )
                  }
                >
                  {plan.active ? "Pausar plano" : "Ativar plano"}
                </button>
              </article>
            ))}
            {!plans.length && !loading && (
              <p className="admin-list-empty">
                Crie o primeiro plano para habilitar pedidos de anúncio no
                diretório.
              </p>
            )}
          </div>
          <form
            className="admin-create admin-create-ad-plan"
            onSubmit={(event) => void createPlan(event)}
          >
            <div className="admin-form-intro">
              <strong>Criar plano</strong>
              <span>O preço será exibido antes do envio do pedido.</span>
            </div>
            <div className="admin-form-fields">
              <label>
                <span>Nome do plano</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Ex.: Destaque 30 dias"
                />
              </label>
              <label>
                <span>Duração (dias)</span>
                <input
                  name="durationDays"
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  required
                  placeholder="30"
                />
              </label>
              <label>
                <span>Preço (R$)</span>
                <input
                  name="price"
                  type="number"
                  min="1"
                  max="1000000"
                  step="0.01"
                  required
                  placeholder="199,00"
                />
              </label>
              <label>
                <span>Descrição (opcional)</span>
                <input
                  name="description"
                  maxLength={300}
                  placeholder="Presença na vitrine local"
                />
              </label>
              <button className="button button-dark" disabled={busy}>
                {busy ? "Salvando…" : "Criar plano de divulgação"}
              </button>
            </div>
          </form>
        </section>
      </div>

      {decision && (
        <div className="admin-dialog-backdrop">
          <section
            className="admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-ad-dialog-title"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) setDecision(null);
            }}
          >
            <button
              className="admin-dialog-close"
              type="button"
              aria-label="Fechar"
              onClick={() => setDecision(null)}
              disabled={busy}
            >
              ×
            </button>
            <span className="panel-kicker">Publicidade paga</span>
            <h2 id="admin-ad-dialog-title">{decision.title}</h2>
            <p>{decision.description}</p>
            <form onSubmit={(event) => void submitReview(event)}>
              <label htmlFor="admin-ad-review-note">
                {decision.submitLabel === "Confirmar e publicar"
                  ? "Registro de pagamento e revisão"
                  : "Motivo da recusa"}
              </label>
              <textarea
                id="admin-ad-review-note"
                name="note"
                required
                minLength={3}
                maxLength={500}
                rows={4}
                autoFocus
                defaultValue={decision.initialNote}
                placeholder="Registre a decisão (mínimo de 3 caracteres)"
              />
              <div className="admin-dialog-actions">
                <button
                  type="button"
                  className="button button-light"
                  onClick={() => setDecision(null)}
                  disabled={busy}
                >
                  Cancelar
                </button>
                <button className="button button-dark" disabled={busy}>
                  {busy ? "Salvando…" : decision.submitLabel}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

type AppMode = "home" | "login" | "register" | "recover" | "reset" | "confirm";

function authModeFromLocation(): AppMode {
  if (window.location.pathname === "/recuperar-senha")
    return new URLSearchParams(window.location.search).get("token")
      ? "reset"
      : "recover";
  if (window.location.pathname === "/confirmar-email") return "confirm";
  return "home";
}

function dashboardPathForRole(role: Role) {
  if (role === "ADMIN") return adminPaths.overview;
  return role === "PROVIDER" ? "/painel/profissional" : "/painel/cliente";
}

function isDashboardPath(pathname: string) {
  return (
    pathname === "/painel/cliente" ||
    pathname === "/painel/profissional" ||
    Object.values(adminPaths).includes(pathname)
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<AppMode>(authModeFromLocation);
  const [role, setRole] = useState<"CUSTOMER" | "PROVIDER">("CUSTOMER");
  const [categories, setCategories] = useState<Category[]>([]);
  const [publicPage, setPublicPage] = useState<PublicPage>(() =>
    publicPageFromPath(window.location.pathname),
  );
  const [profileId, setProfileId] = useState<string | null>(() =>
    providerIdFromPath(window.location.pathname),
  );
  const navigate = useCallback((nextPage: PublicPage) => {
    const nextPath = publicPaths[nextPage];
    if (window.location.pathname !== nextPath)
      window.history.pushState({}, "", nextPath);
    setProfileId(null);
    setPublicPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const api = useCallback<ApiCall>(
    async (path, init = {}) => {
      const request = (token?: string) =>
        fetch(`${API}${path}`, {
          ...init,
          credentials: "include",
          headers: {
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...init.headers,
          },
        });
      let response = await request(session?.accessToken);
      if (response.status === 401 && session) {
        const refreshed = await refreshSession();
        if (refreshed) {
          setSession(refreshed);
          response = await request(refreshed.accessToken);
        } else setSession(null);
      }
      return parseResponse(response);
    },
    [session],
  );
  useEffect(() => {
    void fetch(`${API}/categories`)
      .then((response) => response.json())
      .then(setCategories)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    void refreshSession().then((refreshed) => {
      if (refreshed) setSession(refreshed);
    });
  }, []);
  useEffect(() => {
    const updatePublicPage = () => {
      setPublicPage(publicPageFromPath(window.location.pathname));
      setProfileId(providerIdFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", updatePublicPage);
    return () => window.removeEventListener("popstate", updatePublicPage);
  }, []);
  function signOut() {
    void api("/auth/logout", { method: "POST" }).catch(() => undefined);
    setSession(null);
    setMode("home");
    navigate("home");
  }
  const showDashboard = Boolean(
    session && isDashboardPath(window.location.pathname),
  );
  if (mode !== "home" && !session)
    return (
      <AuthPanel
        mode={mode}
        role={role}
        onMode={setMode}
        onRole={setRole}
        onAuthenticated={(value) => {
          setSession(value);
          setMode("home");
          window.location.assign(dashboardPathForRole(value.user.role));
        }}
        onBack={() => {
          window.history.replaceState({}, "", "/");
          setMode("home");
        }}
      />
    );
  return (
    <div
      className={`app-shell ${showDashboard ? "app-shell-dashboard" : "app-shell-directory"}`}
    >
      <Header
        user={session?.user}
        api={session ? api : undefined}
        publicMode={!showDashboard}
        onNavigate={
          showDashboard && session
            ? () =>
                window.location.assign(dashboardPathForRole(session.user.role))
            : navigate
        }
        onLogin={() => setMode("login")}
        onRegister={(nextRole) => {
          setRole(nextRole);
          setMode("register");
        }}
        onLogout={signOut}
      />
      {showDashboard && session && !session.user.emailVerified && (
        <EmailVerificationNotice api={api} />
      )}
      {!showDashboard ? (
        <Home
          page={publicPage}
          profileId={profileId}
          categories={categories}
          api={api}
          onRegister={(nextRole) => {
            setRole(nextRole);
            setMode("register");
          }}
          onNavigate={navigate}
        />
      ) : session?.user.role === "CUSTOMER" ? (
        <CustomerDashboard api={api} categories={categories} />
      ) : session?.user.role === "PROVIDER" ? (
        <ProviderDashboard api={api} />
      ) : (
        <AdminDashboard
          api={api}
          section={adminSectionFromPath(window.location.pathname)}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
