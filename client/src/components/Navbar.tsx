import { Link } from "wouter";
import lightLogo from "../assests/light_logo.png";
import lightName from "../assests/light_name.png";
import darkLogo from "../assests/dark_logo.png";
import darkName from "../assests/dark_name.png";

export function Navbar() {
  return (
    <nav className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="container h-full mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/">
            <a className="flex items-center space-x-2">
              <img src={lightLogo} alt="CodeArena logo" className="h-10 w-auto dark:hidden" />
              <img src={darkLogo} alt="CodeArena logo" className="h-10 w-auto hidden dark:block" />
              <img src={lightName} alt="CodeArena" className="h-8 w-auto dark:hidden" />
              <img src={darkName} alt="CodeArena" className="h-9 w-auto hidden dark:block" />
            </a>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/problems">
              <a className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Problems</a>
            </Link>
            <Link href="/contests">
              <a className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Contests</a>
            </Link>
            <Link href="/courses">
              <a className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Courses</a>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 