import React, { useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
} from "framer-motion";
import {
  Terminal,
  Users,
  Calendar,
  Trophy,
  Code2,
  ArrowRight,
  Linkedin,
  Instagram,
  ExternalLink,
  Activity,
} from "lucide-react";
import NotFound from "@/pages/not-found";
import ShapeGrid from "@/components/ShapeGrid";
import communityPhoto from "@assets/WhatsApp_Image_2026-04-05_at_19.12.06_1775396542624.jpeg";
// Place the provided logo file at attached_assets/Campus Club.png
import campusLogo from "@assets/Campus Club.png";
// GGITS college logo (attached asset)
import ggitsLogo from "@assets/ggitslogo.png";

const queryClient = new QueryClient();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
const HAS_API_BACKEND = import.meta.env.VITE_DISABLE_GALLERY_API !== "true";
type GalleryImage = { url: string; name: string };
const LOCAL_GALLERY_STORAGE_KEY = "mlc-ggits-local-gallery-images";
const FALLBACK_GALLERY_IMAGES = [
  { url: `${import.meta.env.BASE_URL}copilot-logo.jpeg`, name: "copilot-logo" },
  { url: `${import.meta.env.BASE_URL}opengraph.jpg`, name: "opengraph" },
  { url: communityPhoto, name: "community-photo" },
];

const apiPath = (path: string) => (API_BASE_URL ? `${API_BASE_URL}${path}` : path);

const loadLocalGalleryImages = (): GalleryImage[] => {
  try {
    const raw = window.localStorage.getItem(LOCAL_GALLERY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GalleryImage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item?.url === "string" && typeof item?.name === "string");
  } catch {
    return [];
  }
};

const saveLocalGalleryImages = (images: GalleryImage[]) => {
  try {
    window.localStorage.setItem(LOCAL_GALLERY_STORAGE_KEY, JSON.stringify(images.slice(0, 20)));
  } catch {
    // Ignore localStorage quota errors and keep the in-memory gallery working.
  }
};

const fileToDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });

const LINKTREE_STORAGE_KEY = "mlc-ggits-linktree-click-counts";

type LinkTreeEntry = {
  id: string;
  label: string;
  description: string;
  href: string;
};

const LINKTREE_LINKS: LinkTreeEntry[] = [
  {
    id: "instagram",
    label: "Instagram",
    description: "Drop your Instagram URL here.",
    href: "#",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "Drop your LinkedIn URL here.",
    href: "#",
  },
  {
    id: "website",
    label: "Website",
    description: "Drop your website or portfolio URL here.",
    href: "#",
  },
  {
    id: "gallery",
    label: "Gallery",
    description: "Drop your gallery or photo dump URL here.",
    href: "#",
  },
  {
    id: "community",
    label: "Community",
    description: "Drop your community chat URL here.",
    href: "#",
  },
];

const loadLinkClickCounts = (): Record<string, number> => {
  try {
    const raw = window.localStorage.getItem(LINKTREE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === "number" && Number.isFinite(value)),
    );
  } catch {
    return {};
  }
};

const saveLinkClickCounts = (counts: Record<string, number>) => {
  try {
    window.localStorage.setItem(LINKTREE_STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // Ignore localStorage quota or privacy-mode failures.
  }
};

const LinkTreeSection = () => {
  const [clickCounts, setClickCounts] = useState<Record<string, number>>(() => loadLinkClickCounts());

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, link: LinkTreeEntry) => {
    setClickCounts((currentCounts) => {
      const nextCounts = {
        ...currentCounts,
        [link.id]: (currentCounts[link.id] ?? 0) + 1,
      };
      saveLinkClickCounts(nextCounts);
      return nextCounts;
    });

    if (!link.href || link.href === "#") {
      event.preventDefault();
    }
  };

  const totalClicks = Object.values(clickCounts).reduce((sum, value) => sum + value, 0);

  return (
    <section id="links" className="py-16 px-4 sm:px-6 border-t border-white/5 relative">
      <div className="container mx-auto max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-black/20 text-[#00FF41] font-mono text-sm mb-4">
            LINK HUB
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">Links & Resources</h2>
          <p className="text-gray-400 text-base max-w-2xl mx-auto">Compact hub for your social profiles, projects and community links. Clicks are tracked locally.</p>
        </motion.div>

        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400 font-mono">Tracked links</div>
            <div className="px-4 py-2 bg-black/30 border border-white/8 rounded text-white font-semibold text-lg">{LINKTREE_LINKS.length}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400 font-mono">Total clicks</div>
            <div className="px-4 py-2 bg-black/30 border border-white/8 rounded text-white font-semibold text-lg">{totalClicks}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {LINKTREE_LINKS.map((link) => {
            const clicks = clickCounts[link.id] ?? 0;
            return (
              <a
                key={link.id}
                href={link.href || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleLinkClick(e, link)}
                className="group flex flex-col justify-between gap-3 p-4 bg-black/30 border border-white/8 rounded-xl transform transition-transform transition-shadow duration-300 ease-out hover:scale-105 hover:shadow-[0_10px_30px_rgba(0,212,255,0.12)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-white truncate">{link.label}</div>
                    <div className="text-sm text-gray-400 truncate">{link.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">{clicks}</div>
                    <div className="text-xs text-gray-500 uppercase">clicks</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-gray-400">/{link.id}</div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#00D4FF] transition-colors" />
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// TYPING TEXT COMPONENT
const TypewriterText = () => {
  const messages = [
    "> building the future",
    "> learning together",
    "> hack the knowledge",
    "> init mlc_ggits.sh",
  ];
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentMessage = messages[currentMessageIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && displayedText === currentMessage) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayedText === "") {
      setIsDeleting(false);
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    } else {
      const nextDelay = isDeleting ? 30 : 70;
      timeout = setTimeout(() => {
        setDisplayedText((prev) => {
          if (isDeleting) {
            return prev.slice(0, -1);
          } else {
            return currentMessage.slice(0, prev.length + 1);
          }
        });
      }, nextDelay);
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, currentMessageIndex, messages]);

  return (
    <div className="font-mono text-base sm:text-xl md:text-3xl text-[#00FF41] mt-6 px-4 flex items-center justify-center text-center min-h-[2.5rem]">
      <span>{displayedText}</span>
      <span className="cursor-blink ml-1 w-3 h-8 bg-[#00FF41] inline-block"></span>
    </div>
  );
};

// ANIMATED COUNTER
const Counter = ({
  end,
  label,
  icon: Icon,
}: {
  end: number;
  label: string;
  icon: any;
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  useEffect(() => {
    if (inView) {
      let startTime: number;
      const duration = 2000;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const percentage = Math.min(progress / duration, 1);

        // Easing out cubic
        const easeOut = 1 - Math.pow(1 - percentage, 3);
        setCount(Math.floor(easeOut * end));

        if (progress < duration) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [inView, end]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center p-6 rounded-xl border border-white/5 bg-black/20 backdrop-blur-sm"
    >
      <div className="p-4 rounded-full bg-[#0078D4]/10 mb-4">
        <Icon className="w-8 h-8 text-[#0078D4]" />
      </div>
      <div className="text-4xl md:text-5xl font-mono font-bold text-white mb-2 tracking-tighter">
        {count}
        <span className="text-[#00FF41]">+</span>
      </div>
      <div className="text-gray-400 font-medium tracking-wide uppercase text-sm">
        {label}
      </div>
    </motion.div>
  );
};

const GallerySection = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      if (!HAS_API_BACKEND) {
        const localImages = loadLocalGalleryImages();
        setImages(localImages.length ? localImages : FALLBACK_GALLERY_IMAGES);
        return;
      }

      const res = await fetch(apiPath("/api/gallery/images"));
      if (!res.ok) {
        throw new Error(`Gallery fetch failed: ${res.status}`);
      }
      const data = await res.json() as { images: GalleryImage[] };
      const localImages = loadLocalGalleryImages();
      if (data.images?.length) {
        setImages(data.images);
      } else if (localImages.length) {
        setImages(localImages);
      } else {
        setImages(FALLBACK_GALLERY_IMAGES);
      }
    } catch {
      const localImages = loadLocalGalleryImages();
      setImages(localImages.length ? localImages : FALLBACK_GALLERY_IMAGES);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchImages(true);

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void fetchImages(false);
      }
    };

    const intervalId = window.setInterval(() => {
      void fetchImages(false);
    }, 15_000);

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus(null);
    try {
      if (HAS_API_BACKEND) {
        const uploadRes = await fetch(apiPath("/api/gallery/upload"), {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "X-File-Name": file.name,
          },
          body: file,
        });
        if (!uploadRes.ok) {
          throw new Error(`Image upload failed: ${uploadRes.status}`);
        }

        setUploadStatus("Upload complete. Gallery will update shortly.");
        await fetchImages(false);
        return;
      }

      const dataUrl = await fileToDataURL(file);
      const localImage = {
        url: dataUrl,
        name: `local-${Date.now()}-${file.name}`,
      };
      const nextImages = [localImage, ...loadLocalGalleryImages()];
      saveLocalGalleryImages(nextImages);
      setImages(nextImages);
      setUploadStatus("Saved locally in this browser.");
    } catch {
      try {
        const dataUrl = await fileToDataURL(file);
        const localImage = {
          url: dataUrl,
          name: `local-${Date.now()}-${file.name}`,
        };
        const nextImages = [localImage, ...loadLocalGalleryImages()];
        saveLocalGalleryImages(nextImages);
        setImages(nextImages);
        setUploadStatus(
          HAS_API_BACKEND
            ? "API upload failed. Saved locally in this browser."
            : "Saved locally in this browser.",
        );
      } catch {
        setUploadStatus("Upload failed. Could not save image locally.");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section id="gallery" className="py-20 md:py-24 px-4 sm:px-6 border-t border-white/5 bg-black/30 relative">
      <div className="absolute top-0 left-1/2 w-[600px] h-64 bg-[#6E40C9] rounded-full blur-[200px] opacity-5 pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#6E40C9]"></div>
          <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-tight text-white">
            EVENT_GALLERY
          </h2>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#6E40C9]"></div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <p className="font-mono text-sm text-gray-500">// moments from the community</p>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#6E40C9]/50 bg-[#6E40C9]/10 hover:bg-[#6E40C9]/20 text-[#00D4FF] font-mono text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <span className="w-3 h-3 border border-[#00D4FF]/40 border-t-[#00D4FF] rounded-full animate-spin"></span>
                  UPLOADING...
                </>
              ) : (
                <>+ UPLOAD_PHOTO</>
              )}
            </button>
          </div>
        </div>

        {uploadStatus && (
          <div className="mb-6 text-xs font-mono text-[#00D4FF] border border-[#00D4FF]/30 bg-[#00D4FF]/5 rounded px-3 py-2">
            {uploadStatus}
          </div>
        )}

        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded">
            <p className="font-mono text-gray-500">NO_IMAGES_YET</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
            {images.map((img, i) => (
              <motion.div
                key={`${img.url}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="break-inside-avoid group relative overflow-hidden cursor-pointer rounded border border-white/5 hover:border-[#6E40C9]/40 transition-colors"
                onClick={() => setLightbox(img.url)}
              >
                <img
                  src={img.url}
                  alt={`Event photo ${i + 1}`}
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <span className="font-mono text-xs text-gray-300">[ VIEW ]</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-6 right-6 text-gray-400 hover:text-white font-mono text-sm"
            onClick={() => setLightbox(null)}
          >
            [ CLOSE ]
          </button>
          <img
            src={lightbox}
            alt="Gallery"
            className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
};

function Home() {
  const { scrollYProgress } = useScroll();
  useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-[#0078D4] selection:text-white relative overflow-hidden">
      <ShapeGrid
        aria-hidden="true"
        className="shapegrid-bg fixed inset-0 z-0 opacity-80 mix-blend-screen"
        speed={0.45}
        squareSize={100}
        direction="diagonal"
        borderColor="rgba(120, 200, 255, 0.35)"
        hoverFillColor="rgba(0, 212, 255, 0.16)"
        shape="square"
        hoverTrailAmount={4}
      />
      <div className="scanline"></div>

      {/* Navigation / Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Microsoft Campus Club Logo */}
            <div className="flex gap-1 shrink-0">
              <img src={campusLogo} alt="Campus Club" className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded shadow-2xl drop-shadow-lg" />
            </div>
            <span className="font-semibold text-lg hidden sm:block">Microsoft Campus Club</span>
            <span className="text-gray-500 hidden sm:block">|</span>
            <div className="flex items-center gap-2">
              <img src={ggitsLogo} alt="GGITS Logo" className="w-10 h-10 object-contain rounded-full shadow-md" />
              <span className="font-mono font-bold text-[#00D4FF] tracking-tight hidden sm:block">GGITS</span>
            </div>
          </div>
          <nav className="w-full sm:w-auto flex gap-4 sm:gap-6 font-mono text-xs sm:text-sm overflow-x-auto whitespace-nowrap pb-1 sm:pb-0">
            <a
              href="#events"
              className="text-gray-300 hover:text-white transition-colors"
            >
              /events
            </a>
            <a
              href="#about"
              className="text-gray-300 hover:text-white transition-colors"
            >
              /about
            </a>
            <a
              href="#links"
              className="text-[#00D4FF] hover:text-white transition-colors"
            >
              /links
            </a>
            <a
              href="#gallery"
              className="text-gray-300 hover:text-white transition-colors"
            >
              /gallery
            </a>
            <a
              href="#team"
              className="text-gray-300 hover:text-white transition-colors"
            >
              /team
            </a>
            <a
              href="#join"
              className="text-[#00FF41] hover:text-[#00FF41]/80 transition-colors"
            >
              /join
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-36 sm:pt-24">
        {/* Hero Section */}
        <section className="relative min-h-[85vh] sm:min-h-[90vh] flex flex-col items-center justify-center px-4 sm:px-6 text-center py-16 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl mx-auto"
          >
            {/* Big MS Logo */}
            <div className="flex justify-center mb-8">
              <div className="grid grid-cols-2 gap-2 transform rotate-45 group hover:rotate-0 transition-all duration-700 ease-in-out">
                <div className="w-12 h-12 bg-[#F35325] rounded-sm group-hover:scale-110 transition-transform"></div>
                <div className="w-12 h-12 bg-[#81BC06] rounded-sm group-hover:scale-110 transition-transform"></div>
                <div className="w-12 h-12 bg-[#05A6F0] rounded-sm group-hover:scale-110 transition-transform"></div>
                <div className="w-12 h-12 bg-[#FFBA08] rounded-sm group-hover:scale-110 transition-transform"></div>
              </div>
            </div>

            <div className="inline-block px-4 py-1.5 rounded-full border border-[#0078D4]/30 bg-[#0078D4]/10 text-[#00D4FF] font-mono text-sm mb-6 backdrop-blur-md">
              STATUS: ONLINE & READY
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-4 leading-tight">
              Microsoft Campus <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0078D4] via-[#00D4FF] to-[#00FF41]">
                Club
              </span>
            </h1>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-mono text-gray-400 mb-10 sm:mb-12">
              GGITS <span className="text-gray-600">_</span> Jabalpur
            </h2>

            <div className="h-16 mb-12">
              <TypewriterText />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#events"
                className="group relative inline-flex items-center gap-2 px-8 py-4 bg-[#0078D4] text-white font-semibold rounded-none overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform ease-out"></div>
                <span className="relative z-10 flex items-center gap-2 font-mono">
                  [ EXECUTE ]{" "}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </a>
              <a
                href="#about"
                className="group px-8 py-4 bg-transparent border border-white/20 hover:border-white/50 text-white font-mono transition-colors"
              >
                VIEW_DOCS.md
              </a>
            </div>
          </motion.div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-gray-500">
            <Code2 className="w-6 h-6 rotate-90" />
          </div>
        </section>

        {/* Events Section */}
        <section
          id="events"
          className="py-20 md:py-24 px-4 sm:px-6 bg-black/40 border-y border-white/5 relative"
        >
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-4 mb-16">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#0078D4]"></div>
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-tight text-white flex items-center gap-3">
                <Activity className="text-[#00FF41]" />
                ACTIVE_TASKS
              </h2>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#0078D4]"></div>
            </div>

            {/* Featured Event: Copilot Dev Days */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="animated-border-box p-[1px] mb-12"
            >
              <div className="bg-[#0d0d12] p-8 md:p-12 rounded-lg relative overflow-hidden flex flex-col md:flex-row gap-8 items-center border border-white/5">
                {/* Copilot background glow */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#6E40C9] rounded-full blur-[150px] opacity-10 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

                <div className="flex-1 z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6E40C9]/20 border border-[#6E40C9]/30 text-[#00D4FF] text-xs font-mono mb-6">
                    <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse"></span>
                    FEATURED EVENT
                  </div>
                  <h3 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                    GitHub Copilot <br />
                    <span className="text-[#6E40C9]">Dev Days</span>
                  </h3>
                  <p className="text-gray-400 text-lg mb-8 max-w-xl leading-relaxed">
                    An exclusive hands-on event to explore AI-powered
                    development with GitHub Copilot. Level up your coding game
                    with Microsoft's AI pair programmer.
                  </p>

                  <div className="flex flex-wrap gap-4 font-mono text-sm mb-8 text-gray-300">
                    <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded border border-white/5">
                      <Calendar className="w-4 h-4 text-[#0078D4]" /> 11 May
                    </div>
                    <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded border border-white/5">
                      <Users className="w-4 h-4 text-[#0078D4]" /> Limited Seats
                    </div>
                  </div>

                  <a
                    href="https://luma.com/dwdrrbzt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[#6E40C9] hover:bg-[#5a34a6] text-white font-mono transition-colors shadow-[0_0_20px_rgba(110,64,201,0.4)]"
                  >
                    TRUE_SUCCESS! <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="w-full md:w-1/3 flex justify-center z-10">
                  <div className="relative w-48 h-48 sm:w-64 sm:h-64 drop-shadow-[0_0_40px_rgba(110,64,201,0.6)]">
                    <img
                      src={`${import.meta.env.BASE_URL}copilot-logo.jpeg`}
                      alt="GitHub Copilot"
                      className="w-full h-full object-contain rounded-2xl"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Past Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "AI for Developers Workshop", date: "Past" },
                { title: "Cloud Computing Bootcamp", date: "Past" },
                { title: "Open Source Contribution Sprint", date: "Past" },
              ].map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.2 }}
                  className="bg-[#0a0a0f] border border-white/10 p-6 hover:border-[#0078D4]/50 transition-colors group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0078D4] to-transparent scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-white/5 flex items-center justify-center rounded text-gray-400">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono text-[#00FF41] bg-[#00FF41]/10 px-2 py-1 rounded">
                      [ COMPLETED ]
                    </span>
                  </div>
                  <h4 className="text-xl font-bold mb-2">{event.title}</h4>
                  <div className="font-mono text-sm text-gray-500 mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-600"></span>{" "}
                    LOG ARCHIVED
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20 md:py-24 px-4 sm:px-6 relative">
          <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#0078D4] rounded-full blur-[200px] opacity-10 pointer-events-none -translate-y-1/2 -translate-x-1/2"></div>

          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-[#66B2FF]/30 bg-[#0078D4] p-8 shadow-[0_24px_80px_rgba(0,120,212,0.28)]"
              >
                <div className="font-mono text-[#D8F0FF] mb-4">
                  // README.md
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                  Decode your <br />
                  potential.
                </h2>
                <p className="text-white/90 text-lg mb-6 leading-relaxed">
                  Microsoft Campus Club at GGITS is an elite hub for
                  developers, tinkerers, and tech enthusiasts. We bridge the gap
                  between academic theory and bleeding-edge industry practice.
                </p>
                <p className="text-white/90 text-lg mb-8 leading-relaxed">
                  Whether you're compiling your first "Hello World", deploying
                  scalable cloud architectures, or training neural networks, MLC
                  provides the environment, resources, and network to escalate
                  your skills.
                </p>

                <ul className="space-y-4 font-mono text-sm text-white/90">
                  <li className="flex items-center gap-3">
                    <span className="text-[#00FF41]">~%</span> Access to
                    Microsoft ecosystem tools
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-[#00FF41]">~%</span> Hands-on
                    technical workshops
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-[#00FF41]">~%</span> Peer-to-peer code
                    reviews & networking
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="aspect-square bg-[#0b2e5c] border border-[#66B2FF]/25 p-6 font-mono text-sm md:text-base text-white/85 relative overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(11,46,92,0.35)]">
                  {/* Mac style window dots */}
                  <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>

                  <div className="space-y-2 opacity-80">
                    <p>
                      <span className="text-[#00D4FF]">const</span>{" "}
                      <span className="text-white">community</span> ={" "}
                      <span className="text-[#00D4FF]">new</span>{" "}
                      <span className="text-[#00FF41]">MLC</span>(
                      <span className="text-[#FFBA08]">'GGITS'</span>);
                    </p>
                    <p className="mt-4">
                      <span className="text-gray-500">
                        // Initialize growth protocol
                      </span>
                    </p>
                    <p>
                      community.<span className="text-[#05A6F0]">on</span>(
                      <span className="text-[#FFBA08]">'join'</span>, (
                      <span className="text-[#00D4FF]">member</span>) =&gt;{" "}
                      {"{"}
                    </p>
                    <p className="pl-4">
                      member.
                      <span className="text-[#05A6F0]">upgradeSkills</span>();
                    </p>
                    <p className="pl-4">
                      member.
                      <span className="text-[#05A6F0]">expandNetwork</span>();
                    </p>
                    <p className="pl-4">
                      member.
                      <span className="text-[#05A6F0]">buildProjects</span>();
                    </p>
                    <p className="pl-4">
                      <span className="text-[#00D4FF]">return</span>{" "}
                      <span className="text-[#FFBA08]">
                        'Developer Unlocked'
                      </span>
                      ;
                    </p>
                    <p>{"}"});</p>
                    <p className="mt-4 animate-pulse text-[#00FF41]">&gt; _</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <LinkTreeSection />

        {/* Stats Section */}
        <section className="py-20 px-4 sm:px-6 border-t border-white/5 bg-black/20">
          <div className="container mx-auto max-w-3xl">
            <div className="grid grid-cols-2 gap-6 md:gap-10">
              <Counter end={500} label="Active Members" icon={Users} />
              <Counter end={24} label="Events Held" icon={Calendar} />
            </div>
          </div>
        </section>

        {/* Leaderboard Section removed per request */}

        {/* Team Section */}
        <section id="team" className="py-20 md:py-24 px-4 sm:px-6 border-t border-white/5 bg-black/30 relative">
          <div className="absolute bottom-0 left-1/2 w-[600px] h-64 bg-[#0078D4] rounded-full blur-[200px] opacity-5 pointer-events-none -translate-x-1/2"></div>
          <div className="container mx-auto max-w-5xl">
            <div className="flex items-center gap-4 mb-16">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#00D4FF]"></div>
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-tight text-white flex items-center gap-3">
                <Users className="text-[#00D4FF]" />
                CORE_TEAM
              </h2>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#00D4FF]"></div>
            </div>

            <div className="flex justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0 }}
                className="group flex flex-col items-center text-center p-6 border border-white/5 hover:border-[#00D4FF]/30 bg-black/20 transition-all duration-300 relative overflow-hidden max-w-xs"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#00D4FF]/0 to-[#00D4FF]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {/* Avatar */}
                <div className="relative w-24 h-24 mb-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0078D4] to-[#00D4FF] flex items-center justify-center text-3xl font-bold text-white font-mono">
                    A
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00FF41] border-2 border-[#0a0a0f]"></div>
                </div>
                <h3 className="font-bold text-white text-lg mb-1 leading-tight">Aadeesh Jain</h3>
                <p className="font-mono text-xs text-[#00D4FF] mb-3">@aadeesh.jain</p>
                <span className="text-[10px] font-mono px-2 py-1 bg-[#0078D4]/10 border border-[#0078D4]/20 text-[#0078D4] tracking-widest uppercase">Core Member</span>
              </motion.div>
            </div>
          </div>
        </section>

        <GallerySection />

        {/* CTA Section */}
        <section id="join" className="py-24 md:py-32 px-4 sm:px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0078D4]/10 pointer-events-none"></div>

          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Ready to compile?
              </h2>
              <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                Join the network. Get access to exclusive resources, mentorship,
                and a community of builders who speak your language.
              </p>

              <a
                href="https://chat.whatsapp.com/Hb6tPlQTpnyJbKttmrfIVx"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-10 py-5 bg-white text-black font-bold font-mono hover:bg-gray-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)]"
              >
                &gt; sudo join_community
              </a>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12 px-4 sm:px-6 relative z-10">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div className="flex items-center gap-3">
              <img src={campusLogo} alt="Campus Club" className="w-12 h-12 object-contain rounded shadow-lg drop-shadow-md" />
              <div className="flex flex-col">
                <span className="font-bold leading-none">
                  Microsoft Campus Club
                </span>
                <span className="font-mono text-xs text-gray-500">
                  GGITS Jabalpur
                </span>
              </div>
            </div>

            <div className="flex gap-6">
              <a
                href="https://www.linkedin.com/company/ms-ggits/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-[#0078D4] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-6 h-6" />
              </a>
              <a
                href="https://www.instagram.com/mccggits?igsh=MTJhNDJxbXJ1dHJyZA=="
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-[#E1306C] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-6 h-6" />
              </a>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600 font-mono">
            <p>
              © {new Date().getFullYear()} Microsoft Campus Club GGITS. All
              systems operational.
            </p>
            <p className="flex items-center gap-2">
               <span className="text-[#00FF41]"></span> 
              
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
