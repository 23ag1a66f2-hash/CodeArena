import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  LayoutDashboard, 
  Code, 
  Trophy, 
  GraduationCap, 
  ClipboardList,
  Menu,
  X
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";

export function Sidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isAuthenticated || !user) return null;

  const { data: userStats } = useQuery({
    queryKey: ["/api/users/me/stats"],
  });

  const sidebarItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/problems", icon: Code, label: "Practice Problems" },
    { path: "/contests", icon: Trophy, label: "Contests" },
    { path: "/courses", icon: GraduationCap, label: "Courses" },
    { path: "/assignments", icon: ClipboardList, label: "Assignments" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard" && location === "/") return true;
    return location === path || (path !== "/dashboard" && location.startsWith(path));
  };

  const problemsProgress = userStats ? (userStats.accepted / 120) * 100 : 0;

  // return (
  //   <>
  //     Collapsed sidebar trigger
  //     <div 
  //       className={`fixed left-0 top-16 z-40 transition-all duration-300 ease-in-out hidden lg:block ${
  //         isExpanded ? 'translate-x-64' : 'translate-x-0'
  //       }`}
  //       onMouseEnter={() => setIsExpanded(true)}
  //     >
  //       <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-r-lg shadow-lg p-3 hamburger-hover menu-trigger">
  //         <Menu className="w-5 h-5 text-green-500" />
  //       </div>
  //     </div>

  //     {/* Expanded sidebar */}
  //     <aside 
  //       className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-xl z-30 transition-all duration-300 ease-in-out hidden lg:block ${
  //         isExpanded ? 'translate-x-0 w-64' : '-translate-x-64 w-64'
  //       }`}
  //       onMouseEnter={() => setIsExpanded(true)}
  //       onMouseLeave={() => setIsExpanded(false)}
  //     >
  //       <div className="relative h-full">
  //         {/* Close button */}
  //         <button
  //           onClick={() => setIsExpanded(false)}
  //           className="absolute top-4 right-4 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
  //         >
  //           <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
  //         </button>

  //         <div className="p-6 overflow-y-auto h-full">
  //           <div className={`${isExpanded ? 'sidebar-expanded' : ''}`}>
  //             <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 opacity-0 animate-[fadeInUp_0.3s_ease-out_0.1s_forwards]">
  //               Quick Access
  //             </h2>
  //             <nav className="space-y-2">
  //               {sidebarItems.map((item, index) => (
  //                 <Link
  //                   key={item.path}
  //                   href={item.path}
  //                   className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-md group opacity-0 ${
  //                     isActive(item.path)
  //                       ? "text-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm border border-green-200 dark:border-green-800"
  //                       : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
  //                   }`}
  //                   style={{
  //                     animation: isExpanded ? `fadeInUp 0.3s ease-out ${0.2 + index * 0.1}s forwards` : 'none'
  //                   }}
  //                 >
  //                   <item.icon className={`w-5 h-5 transition-all duration-200 group-hover:scale-110 group-hover:rotate-3 ${
  //                     isActive(item.path) ? 'text-green-500' : ''
  //                   }`} />
  //                   <span className={`transition-all duration-200 ${
  //                     isActive(item.path) ? "font-semibold" : ""
  //                   }`}>
  //                     {item.label}
  //                   </span>
  //                   {isActive(item.path) && (
  //                     <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
  //                   )}
  //                 </Link>
  //               ))}
  //             </nav>

  //             <div className="mt-8 opacity-0" style={{
  //               animation: isExpanded ? 'fadeInUp 0.4s ease-out 0.6s forwards' : 'none'
  //             }}>
  //               <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center">
  //                 <span className="w-2 h-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mr-2"></span>
  //                 Progress
  //               </h3>
  //               <div className="space-y-3">
  //                 <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md">
  //                   <div className="flex justify-between text-sm mb-2">
  //                     <span className="text-gray-600 dark:text-gray-300">Problems Solved</span>
  //                     <span className="font-semibold text-gray-900 dark:text-white bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full text-xs">
  //                       {userStats?.accepted || 0}/120
  //                     </span>
  //                   </div>
  //                   <Progress value={problemsProgress} className="h-3 progress-shimmer" />
  //                 </div>
  //                 <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md">
  //                   <div className="flex justify-between text-sm items-center">
  //                     <span className="text-gray-600 dark:text-gray-300">Current Streak</span>
  //                     <span className="font-semibold text-green-600 dark:text-green-400 flex items-center bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
  //                       <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
  //                       {userStats?.streak || 0} days
  //                     </span>
  //                   </div>
  //                 </div>
  //               </div>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     </aside>

  //     {/* Backdrop for mobile */}
  //     {isExpanded && (
  //       <div 
  //         className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
  //         onClick={() => setIsExpanded(false)}
  //       />
  //     )}


  //   </>
  // );
}


export default Sidebar;