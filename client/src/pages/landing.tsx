import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Code, Trophy, Users, Zap, ClipboardList,Star, ArrowRight, CheckCircle, Play, TrendingUp, Globe, Shield, Clock } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MaintenanceMessage } from "@/components/MaintenanceMessage";
import lightLogo from "../assests/light_logo.png";
import lightName from "../assests/light_name.png";
import darkLogo from "../assests/dark_logo.png";
import darkName from "../assests/dark_name.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-900/20">
      {/* Maintenance Message Banner */}
      <MaintenanceMessage />
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <img src={lightLogo} alt="CodeArena logo" className="h-12 w-auto dark:hidden" />
                <img src={darkLogo} alt="CodeArena logo" className="h-12 w-auto hidden dark:block" />
                <img src={lightName} alt="CodeArena" className="h-10 w-auto dark:hidden" />
                <img src={darkName} alt="CodeArena" className="h-11 w-auto hidden dark:block" />
              </div>
            </div>
            {/* <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors font-medium">Home</Link>
              <Link href="/problems" className="text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors font-medium">Problems</Link>
              <Link href="/courses" className="text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors font-medium">Courses</Link>
              <Link href="/contests" className="text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors font-medium">Contests</Link>
            </div> */}
            <div className="flex items-center gap-4">
              {/* <ThemeToggle />  */}
              <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5">
                <Link href="/login">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 via-blue-50 to-indigo-50 dark:from-emerald-900/20 dark:via-blue-900/20 dark:to-indigo-900/20"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-300/30 dark:bg-emerald-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-300/30 dark:bg-blue-600/20 rounded-full blur-3xl"></div>

        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              {/* <div className="inline-flex items-center space-x-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-full text-sm font-medium">
                <Star className="h-4 w-4" />
                <span>Trusted by 50K+ Developers Worldwide</span>
              </div> */}

              <h1 className="text-6xl font-bold text-slate-900 dark:text-white leading-tight">
                Master Coding Through{" "}
                <span className="bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                  Competition
                </span>
              </h1>

              <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg">
                Join thousands of developers improving their skills through challenging problems,
                live contests, and comprehensive courses on CodeArena.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <Link href="/login">Start Coding Now</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 border-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300">
                  <Link href="/problems">View Problems</Link>
                </Button>
              </div>

              <div className="flex items-center space-x-8 pt-4">
                <div className="flex items-center space-x-2">
                  <div className="flex -space-x-2">
                    {["👨‍💻", "👩‍💻", "👨‍🔬", "👩‍🔬"].map((avatar, i) => (
                      <div key={i} className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-sm border-2 border-white dark:border-slate-800">
                        {avatar}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Join 50K+ developers</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
                    <div className="text-slate-600 dark:text-slate-400 text-sm mb-2">// Solve this problem</div>
                    <div className="text-slate-800 dark:text-slate-200 font-mono">function twoSum(nums, target) {'{'}</div>
                    <div className="text-slate-800 dark:text-slate-200 font-mono pl-4">// Your solution here</div>
                    <div className="text-slate-800 dark:text-slate-200 font-mono">{'}'}</div>
                  </div>
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-3">
                    <div className="text-emerald-700 dark:text-emerald-300 text-sm">✅ Test cases passed!</div>
                  </div>
                </div>
              </div>

              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                Live Coding
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { number: "10K+", label: "Problems Solved", icon: CheckCircle, bgColor: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600 dark:text-emerald-400" },
              { number: "500+", label: "Live Contests", icon: Trophy, bgColor: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400" },
              { number: "50K+", label: "Active Users", icon: Users, bgColor: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400" },
              { number: "99.9%", label: "Uptime", icon: Shield, bgColor: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-600 dark:text-green-400" }
            ].map((stat, index) => (
              <div key={index} className="text-center group">
                <div className={`w-16 h-16 ${stat.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`h-8 w-8 ${stat.iconColor}`} />
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{stat.number}</div>
                <div className="text-slate-600 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-800 dark:to-emerald-900/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Why Choose CodeArena?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Experience the most comprehensive coding platform designed to accelerate your programming journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Code,
                title: "Practice Problems",
                description: "Solve thousands of problems across different difficulty levels and topics.",
                bgColor: "bg-blue-100 dark:bg-blue-900/30",
                iconColor: "text-blue-600 dark:text-blue-400",
                features: ["10K+ Problems", "Multiple Languages", "Difficulty Levels"]
              },
              {
                icon: Trophy,
                title: "Live Contests",
                description: "Participate in weekly contests and compete with developers worldwide.",
                bgColor: "bg-amber-100 dark:bg-amber-900/30",
                iconColor: "text-amber-600 dark:text-amber-400",
                features: ["Weekly Contests", "Real-time Ranking", "Global Leaderboard"]
              },
              {
                icon: ClipboardList,
                title: "Assignments",
                description: "Learn by solving problems, submitting work, and tracking progress.",
                bgColor: "bg-purple-100 dark:bg-purple-900/30",
                iconColor: "text-purple-600 dark:text-purple-400",
                features: ["Problem Solving", "Submission Tracking", "Progress Monitoring"]
              },              
              {
                icon: Zap,
                title: "Real-time Execution",
                description: "Test your code instantly with our powerful online judge system.",
                bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
                iconColor: "text-emerald-600 dark:text-emerald-400",
                features: ["Instant Results", "Multiple Languages", "Performance Metrics"]
              }
            ].map((feature, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border-0 bg-white dark:bg-slate-800 shadow-lg">
                <CardContent className="p-8">
                  <div className={`w-16 h-16 ${feature.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`${feature.iconColor} h-8 w-8`} />
                  </div>
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-4 text-center">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-center mb-6 leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.features.map((item, i) => (
                      <li key={i} className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle className="h-4 w-4 text-emerald-500 mr-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Main CTA Section - Using Hero Section Theme */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 via-blue-50 to-indigo-50 dark:from-emerald-900/20 dark:via-blue-900/20 dark:to-indigo-900/20"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-300/30 dark:bg-emerald-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-300/30 dark:bg-blue-600/20 rounded-full blur-3xl"></div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-6xl font-bold text-slate-900 dark:text-white mb-8 leading-tight">
            Ready to Level Up Your{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
              Coding Skills?
            </span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join CodeArena today and start your journey to becoming a better programmer.
            Compete, learn, and grow with developers worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-lg px-10 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <Link href="/register">Sign Up Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-10 py-6 border-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300">
              <Link href="/problems">Explore Problems</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer - Using Features Section Theme */}
      <footer className="py-20 px-4 bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-800 dark:to-emerald-900/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Column 1 - Branding */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center">
                  <img
                    src={lightLogo}
                    alt="Logo"
                    className="h-20 object-contain" // Increased height here
                  />
                </div>


                <span className="text-2xl font-bold text-slate-900 dark:text-white">CodeArena</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-xs">
                The ultimate platform for competitive programming and skill development.
              </p>
            </div>

            {/* Column 2 - Platform */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-6 text-lg">Platform</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="/problems" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">Problems</Link></li>
                <li><Link href="/contests" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">Contests</Link></li>
                <li><Link href="/courses" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">Courses</Link></li>
                <li><Link href="/leaderboard" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">Leaderboard</Link></li>
              </ul>
            </div>

            {/* Column 3 - Support */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-6 text-lg">Support</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="/help" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">Help Center</Link></li>
                <li><Link href="/docs" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">Documentation</Link></li>
                <li><Link href="/contact" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">Contact Us</Link></li>
                <li><Link href="/status" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">System Status</Link></li>
              </ul>
            </div>

            {/* Column 4 - Company */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-6 text-lg">Company</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="/about" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">About</Link></li>
                <li><Link href="/careers" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">Careers</Link></li>
                <li><Link href="/privacy" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">Privacy</Link></li>
                <li><Link href="/terms" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">Terms</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              © 2025 CodeArena.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
