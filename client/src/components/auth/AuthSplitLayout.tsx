import { ReactNode, useEffect, useRef, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import overviewImg from "@/assests/login/Overview.jpg";
import assignmentsImg from "@/assests/login/Assignments.jpg";
import courseImg from "@/assests/login/Course.jpg";
import contestImg from "@/assests/login/Contest.jpg";
import lightLogo from "@/assests/light_logo.png";
import darkLogo from "@/assests/dark_logo.png";
import lightName from "@/assests/light_name.png";
import darkName from "@/assests/dark_name.png";

interface AuthSplitLayoutProps {
  children: ReactNode;
  title: string;
}

export default function AuthSplitLayout({ children, title }: AuthSplitLayoutProps) {
  const slides = [
    { src: overviewImg, title: "Comprehensive competitive programming platform", subtitle: "Master Coding Through Competition" },
    { src: assignmentsImg, title: "Practice problems with instant feedback and online judge", subtitle: "Track progress with instant feedback" },
    { src: courseImg, title: "Learn with guided courses", subtitle: "Watch - Read - Code - Repeat" },
    { src: contestImg, title: "Live coding competitions with real-time execution", subtitle: "Compete with friends and improve" },
  ];
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!api) return;
    setScrollSnaps(api.scrollSnapList());
    setSelectedIndex(api.selectedScrollSnap());
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    const start = () => {
      stop();
      intervalRef.current = window.setInterval(() => {
        api.scrollNext();
      }, 4500);
    };
    const stop = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    start();

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
      stop();
    };
  }, [api]);

  return (
    <div className="relative w-full h-screen min-h-screen grid grid-cols-1 md:grid-cols-2 overflow-hidden">
      {/* Left: Image carousel */}
      <div className="relative hidden md:block bg-white ">
        <Carousel className="h-full w-full" setApi={setApi} opts={{ loop: true }}>
          <CarouselContent className="h-full">
            {slides.map((slide, idx) => (
              <CarouselItem key={idx} className="basis-full h-full">
                <div className="relative h-full w-full">
                  <img src={slide.src} alt="Showcase" className="h-full w-full object-cover" />
                  <div className="absolute top-10 left-10 right-10 text-black">
                    <h2 className="text-2xl font-semibold tracking-tight">{slide.title}</h2>
                    <p className="mt-2 text-sm">{slide.subtitle}</p>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        {/* Dots */}
        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
          {scrollSnaps.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => api?.scrollTo(idx)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                idx === selectedIndex ? "bg-white" : "bg-white/50"
              } shadow ring-1 ring-black/30`}
            />
          ))}
        </div>
      </div>

      {/* Right: Form */}
      <div className="relative flex items-center justify-center p-6 md:p-10 bg-white bg-blend-soft-light from-green-200 via-green-300 to-sky-300 dark:bg-gray-900 dark:bg-none rounded-lg shadow-2xl shadow-black">

        {/* <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div> */}
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
            <div className="mt-4 flex items-center justify-center">
              <img src={lightLogo} alt="CodeArena" className="h-16 w-auto dark:hidden" />
              <img src={lightName} alt="CodeArena" className="h-14 w-auto dark:hidden" />
              <img src={darkLogo} alt="CodeArena" className="h-16 w-auto hidden dark:block" />
              <img src={darkName} alt="CodeArena" className="h-14 w-auto hidden dark:block" />
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
} 