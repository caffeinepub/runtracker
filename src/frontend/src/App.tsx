import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Activity,
  BarChart2,
  ChevronRight,
  Clock,
  Flame,
  Github,
  Instagram,
  MapPin,
  Pause,
  Play,
  Square,
  Trophy,
  Twitter,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { RunSession } from "./backend.d";
import { AdventureChallenges } from "./components/AdventureChallenges";
import { RunMap } from "./components/RunMap";
import { useGetAllRuns, useSaveRun } from "./hooks/useQueries";

const queryClient = new QueryClient();

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatPace(distanceKm: number, durationSeconds: number): string {
  if (distanceKm < 0.01) return "--:--";
  const paceSeconds = durationSeconds / distanceKm;
  const m = Math.floor(paceSeconds / 60);
  const s = Math.round(paceSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

type RunState = "idle" | "running" | "paused";

function AppInner() {
  const [runState, setRunState] = useState<RunState>("idle");
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [currentPosition, setCurrentPosition] = useState<
    [number, number] | null
  >(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [startTimestamp, setStartTimestamp] = useState<number>(0);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<[number, number] | null>(null);
  const isPausedRef = useRef(false);

  const { data: runs = [] } = useGetAllRuns();
  const { mutate: saveRun } = useSaveRun();

  const calories = Math.round((distanceMeters / 1000) * 70 * 1.036);
  const distanceKm = distanceMeters / 1000;
  const pace = formatPace(distanceKm, durationSeconds);

  const stopWatcher = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startWatcher = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported on this device.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (isPausedRef.current) return;
        const { latitude, longitude } = pos.coords;
        const newPoint: [number, number] = [latitude, longitude];
        setCurrentPosition(newPoint);
        setRoutePoints((prev) => {
          const last = prev[prev.length - 1];
          if (last) {
            const d = haversineDistance(last[0], last[1], latitude, longitude);
            if (d < 3) return prev; // filter noise < 3m
            setDistanceMeters((prevD) => prevD + d);
          }
          lastPositionRef.current = newPoint;
          return [...prev, newPoint];
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(
            "Location permission denied. Please allow location access.",
          );
        } else {
          setGeoError(`Location error: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    );
  }, []);

  const handleStart = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported on this device.");
      return;
    }
    setGeoError(null);
    setDistanceMeters(0);
    setDurationSeconds(0);
    setRoutePoints([]);
    lastPositionRef.current = null;
    isPausedRef.current = false;
    setStartTimestamp(Date.now());
    setRunState("running");
    startWatcher();
    timerRef.current = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
    toast.success("Run started! Good luck! 🏃");
  }, [startWatcher]);

  const handlePause = useCallback(() => {
    isPausedRef.current = true;
    stopTimer();
    setRunState("paused");
    toast("Run paused");
  }, [stopTimer]);

  const handleResume = useCallback(() => {
    isPausedRef.current = false;
    timerRef.current = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
    setRunState("running");
    toast("Run resumed!");
  }, []);

  const handleStop = useCallback(() => {
    stopWatcher();
    stopTimer();
    isPausedRef.current = false;
    setRunState("idle");

    if (distanceMeters > 10) {
      const endTs = BigInt(Date.now());
      const session: RunSession = {
        id: `run-${Date.now()}`,
        startTimestamp: BigInt(startTimestamp),
        endTimestamp: endTs,
        distanceMeters,
        durationSeconds,
        caloriesBurned: calories,
        route: routePoints,
      };
      saveRun(session, {
        onSuccess: () => toast.success("Run saved! Great job! 🎉"),
        onError: () => toast.error("Failed to save run"),
      });
    } else {
      toast("Run stopped (too short to save)");
    }
  }, [
    stopWatcher,
    stopTimer,
    distanceMeters,
    durationSeconds,
    calories,
    routePoints,
    startTimestamp,
    saveRun,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatcher();
      stopTimer();
    };
  }, [stopWatcher, stopTimer]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToMap = () => scrollToSection("map-section");

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-orange flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">
              StrideLog
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {["Dashboard", "Routes", "Challenges", "Activity", "Community"].map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  data-ocid={`nav.${item.toLowerCase()}.link`}
                  onClick={() => {
                    if (item === "Challenges") {
                      scrollToSection("challenges-section");
                    } else if (item === "Dashboard") {
                      scrollToSection("map-section");
                    }
                  }}
                  className={`text-sm transition-colors ${
                    item === "Dashboard"
                      ? "text-brand-orange font-semibold border-b-2 border-brand-orange pb-0.5"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ),
            )}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleStart}
              disabled={runState !== "idle"}
              className="rounded-full bg-brand-orange hover:bg-brand-orange-light text-white font-semibold px-5"
              data-ocid="nav.start_run.button"
            >
              <Play className="w-4 h-4 mr-1.5" />
              Start Run
            </Button>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center cursor-pointer">
              <span className="text-xs font-bold text-muted-foreground">
                JD
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.13 0.02 240) 0%, oklch(0.1 0.03 240) 50%, oklch(0.15 0.04 185) 100%)",
          }}
        />
        <div
          className="absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 50%, rgba(46,211,198,0.3) 0%, transparent 60%), radial-gradient(circle at 30% 70%, rgba(243,109,33,0.2) 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28 flex flex-col md:flex-row items-center gap-12">
          <motion.div
            className="flex-1 max-w-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 bg-brand-orange/20 text-brand-orange border-brand-orange/30 uppercase tracking-widest text-xs font-bold">
              GPS Run Tracker
            </Badge>
            <p className="text-brand-orange uppercase font-bold tracking-widest text-sm mb-2">
              UNLEASH YOUR RUN.
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight mb-4">
              Discover Your
              <br />
              <span className="text-brand-teal">Distance</span> &amp; Route
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mb-8">
              Real-time GPS tracking, live metrics, and an interactive map —
              every run mapped, every step counted.
            </p>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => {
                  handleStart();
                  scrollToMap();
                }}
                disabled={runState !== "idle"}
                size="lg"
                className="rounded-full bg-brand-orange hover:bg-brand-orange-light text-white font-bold px-8 shadow-glow"
                data-ocid="hero.start_run.primary_button"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Running
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={scrollToMap}
                className="rounded-full border-border text-muted-foreground hover:text-foreground"
                data-ocid="hero.explore_map.secondary_button"
              >
                Explore Map <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="flex-1 max-w-lg w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: Activity,
                  label: "Total Distance",
                  value: "0.00 km",
                  color: "text-brand-orange",
                },
                {
                  icon: Clock,
                  label: "Duration",
                  value: "00:00",
                  color: "text-brand-teal",
                },
                {
                  icon: Zap,
                  label: "Current Pace",
                  value: "--:-- /km",
                  color: "text-brand-orange",
                },
                {
                  icon: Flame,
                  label: "Calories",
                  value: "0 cal",
                  color: "text-brand-teal",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-4"
                >
                  <stat.icon className={`w-5 h-5 mb-2 ${stat.color}`} />
                  <p className="text-xs text-muted-foreground mb-1">
                    {stat.label}
                  </p>
                  <p className={`text-xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                { icon: MapPin, label: "Routes", val: "120+" },
                { icon: Users, label: "Runners", val: "5K+" },
                { icon: Trophy, label: "Challenges", val: "30+" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-card/40 border border-border rounded-lg p-3"
                >
                  <s.icon className="w-4 h-4 mx-auto mb-1 text-brand-orange" />
                  <p className="text-lg font-bold text-foreground">{s.val}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main content: metrics + map */}
      <main id="map-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Geolocation error */}
        {geoError && (
          <div
            className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive text-sm"
            data-ocid="geo.error_state"
          >
            <strong>Location Error:</strong> {geoError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Activity Metrics */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-card border border-border rounded-xl p-6 shadow-card h-full">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-brand-orange" />
                <h2 className="text-lg font-semibold text-foreground">
                  Activity Metrics
                </h2>
                {runState === "running" && (
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
                    <span className="text-xs text-brand-teal font-medium">
                      LIVE
                    </span>
                  </span>
                )}
              </div>

              <div className="space-y-5">
                <div
                  className="pb-5 border-b border-border"
                  data-ocid="metrics.distance.panel"
                >
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Distance
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-foreground">
                      {distanceKm.toFixed(2)}
                    </span>
                    <span className="text-lg text-muted-foreground font-medium">
                      km
                    </span>
                  </div>
                </div>

                <div
                  className="pb-5 border-b border-border"
                  data-ocid="metrics.pace.panel"
                >
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Current Pace
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-brand-teal">
                      {pace}
                    </span>
                    <span className="text-sm text-muted-foreground">/km</span>
                  </div>
                </div>

                <div
                  className="pb-5 border-b border-border"
                  data-ocid="metrics.duration.panel"
                >
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Duration
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      {formatDuration(durationSeconds)}
                    </span>
                  </div>
                </div>

                <div data-ocid="metrics.calories.panel">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Calories Burned
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-brand-orange">
                      {calories}
                    </span>
                    <span className="text-sm text-muted-foreground">Cal</span>
                  </div>
                </div>
              </div>

              {/* Run Controls */}
              <div
                className="mt-8 flex flex-wrap gap-3"
                data-ocid="run.controls.panel"
              >
                {runState === "idle" && (
                  <Button
                    onClick={handleStart}
                    className="flex-1 rounded-full bg-brand-orange hover:bg-brand-orange-light text-white font-bold"
                    data-ocid="run.start.primary_button"
                  >
                    <Play className="w-4 h-4 mr-2" /> Start
                  </Button>
                )}
                {runState === "running" && (
                  <>
                    <Button
                      onClick={handlePause}
                      variant="outline"
                      className="flex-1 rounded-full border-border hover:border-brand-teal hover:text-brand-teal"
                      data-ocid="run.pause.secondary_button"
                    >
                      <Pause className="w-4 h-4 mr-2" /> Pause
                    </Button>
                    <Button
                      onClick={handleStop}
                      variant="outline"
                      className="flex-1 rounded-full border-destructive/50 text-destructive hover:bg-destructive/10"
                      data-ocid="run.stop.delete_button"
                    >
                      <Square className="w-4 h-4 mr-2" /> Stop
                    </Button>
                  </>
                )}
                {runState === "paused" && (
                  <>
                    <Button
                      onClick={handleResume}
                      className="flex-1 rounded-full bg-brand-teal hover:bg-brand-teal-light text-black font-bold"
                      data-ocid="run.resume.primary_button"
                    >
                      <Play className="w-4 h-4 mr-2" /> Resume
                    </Button>
                    <Button
                      onClick={handleStop}
                      variant="outline"
                      className="flex-1 rounded-full border-destructive/50 text-destructive hover:bg-destructive/10"
                      data-ocid="run.stop.delete_button"
                    >
                      <Square className="w-4 h-4 mr-2" /> Stop
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* GPS Map */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card h-full min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-teal" />
                  <h2 className="text-lg font-semibold text-foreground">
                    GPS Map
                  </h2>
                </div>
                {currentPosition && (
                  <Badge className="bg-brand-teal/20 text-brand-teal border-brand-teal/30 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-teal mr-1.5 inline-block animate-pulse" />
                    GPS Active
                  </Badge>
                )}
              </div>
              <div className="flex-1 relative">
                <RunMap
                  routePoints={routePoints}
                  currentPosition={currentPosition}
                  defaultCenter={[40.7128, -74.006]}
                />
                {/* Overlay controls at bottom of map */}
                {runState !== "idle" && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex gap-2">
                    {runState === "running" && (
                      <>
                        <Button
                          size="sm"
                          onClick={handlePause}
                          className="rounded-full bg-background/90 backdrop-blur border border-border text-foreground hover:bg-muted"
                          data-ocid="map.pause.secondary_button"
                        >
                          <Pause className="w-4 h-4 mr-1" /> Pause
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleStop}
                          className="rounded-full bg-destructive/90 backdrop-blur text-white hover:bg-destructive"
                          data-ocid="map.stop.delete_button"
                        >
                          <Square className="w-4 h-4 mr-1" /> Stop
                        </Button>
                      </>
                    )}
                    {runState === "paused" && (
                      <>
                        <Button
                          size="sm"
                          onClick={handleResume}
                          className="rounded-full bg-brand-teal/90 backdrop-blur text-black hover:bg-brand-teal font-bold"
                          data-ocid="map.resume.primary_button"
                        >
                          <Play className="w-4 h-4 mr-1" /> Resume
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleStop}
                          className="rounded-full bg-destructive/90 backdrop-blur text-white hover:bg-destructive"
                          data-ocid="map.stop.delete_button"
                        >
                          <Square className="w-4 h-4 mr-1" /> Stop
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-brand-teal inline-block rounded" />
                  Route path
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-brand-orange border-2 border-white inline-block" />
                  Current position
                </span>
                <span className="ml-auto">{routePoints.length} waypoints</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Run History */}
        <motion.section
          className="mt-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-5 h-5 text-brand-orange" />
            <h2 className="text-xl font-semibold text-foreground">
              Run History
            </h2>
          </div>

          {runs.length === 0 ? (
            <div
              className="bg-card border border-border rounded-xl p-12 text-center"
              data-ocid="history.empty_state"
            >
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-40" />
              <p className="text-muted-foreground text-sm">
                No runs yet. Start your first run!
              </p>
            </div>
          ) : (
            <div
              className="bg-card border border-border rounded-xl overflow-hidden shadow-card"
              data-ocid="history.table"
            >
              <div className="grid grid-cols-5 px-6 py-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <span>Date</span>
                <span>Distance</span>
                <span>Duration</span>
                <span>Pace</span>
                <span>Calories</span>
              </div>
              {runs.map((run, i) => (
                <div
                  key={run.id}
                  className="grid grid-cols-5 px-6 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  data-ocid={`history.item.${i + 1}`}
                >
                  <span className="text-sm text-foreground">
                    {new Date(Number(run.startTimestamp)).toLocaleDateString()}
                  </span>
                  <span className="text-sm font-semibold text-brand-teal">
                    {(run.distanceMeters / 1000).toFixed(2)} km
                  </span>
                  <span className="text-sm text-foreground">
                    {formatDuration(run.durationSeconds)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatPace(run.distanceMeters / 1000, run.durationSeconds)}{" "}
                    /km
                  </span>
                  <span className="text-sm text-brand-orange">
                    {run.caloriesBurned} Cal
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Adventure Challenges */}
        <AdventureChallenges runs={runs} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-brand-orange flex items-center justify-center">
                  <span className="text-white font-bold text-xs">S</span>
                </div>
                <span className="font-bold text-foreground">StrideLog</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your personal GPS running companion. Track, analyze, and improve
                every run.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <a
                  href="https://caffeine.ai"
                  className="text-muted-foreground hover:text-brand-orange transition-colors"
                  data-ocid="footer.github.link"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a
                  href="https://caffeine.ai"
                  className="text-muted-foreground hover:text-brand-orange transition-colors"
                  data-ocid="footer.twitter.link"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="https://caffeine.ai"
                  className="text-muted-foreground hover:text-brand-orange transition-colors"
                  data-ocid="footer.instagram.link"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
            </div>
            {[
              {
                heading: "Product",
                links: ["Dashboard", "GPS Tracking", "Analytics", "Challenges"],
              },
              {
                heading: "Company",
                links: ["About", "Blog", "Careers", "Press"],
              },
              {
                heading: "Support",
                links: ["Help Center", "Contact", "Privacy", "Status"],
              },
              {
                heading: "Legal",
                links: ["Privacy Policy", "Terms", "Cookies", "Licenses"],
              },
            ].map((col) => (
              <div key={col.heading}>
                <p className="text-sm font-semibold text-foreground mb-3">
                  {col.heading}
                </p>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                      >
                        {link}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-brand-orange flex items-center justify-center">
                <span className="text-white font-bold text-xs">S</span>
              </div>
              <span className="text-xs text-muted-foreground">StrideLog</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()}. Built with ❤️ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
                className="hover:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
