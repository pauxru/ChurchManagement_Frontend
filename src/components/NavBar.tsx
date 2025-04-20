"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0";
//import { useToken } from "../../contexts/TokenContext";
import Image from "next/image";
import styles from "./components.module.css/NavBar.module.css";
import Logo from "./Logo";

export default function NavBar() {
  const router = useRouter();
  const { user } = useUser();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    router.push("/profile/editProfile");
    setDropdownOpen(false);
  };

  const isProfileIncomplete = !user?.email_verified;

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.container}>
        <div className={styles.titleWrapper}>
        <Logo />
          <h1 className={styles.title} onClick={() => router.push("/")}>A.I.P.C.A Church</h1>
          
        </div>
          <ul className={styles.navList}>
            <li><a href="#about" className={styles.navItem}>About</a></li>
            <li><a href="#features" className={styles.navItem}>History</a></li>
            <li><span onClick={() => router.push("/transfers")} className={styles.navItem}>Transfers</span></li>
            <li><span onClick={() => router.push("/localChurches/searchLocalChurch")} className={styles.navItem}>Churches</span></li>
            <li><span onClick={() => router.push("/members/searchMembers")} className={styles.navItem}>Members</span></li>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <div
                  className={styles.userWrapper}
                  onClick={() => setDropdownOpen((prev) => !prev)}
                >
                  <Image
                    src={"/images/members.svg"}
                    alt={user.name || "User"}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <span>{user.name}</span>
                </div>

                {dropdownOpen && (
                  <div className={styles.dropdown}>
                    <button onClick={handleProfileClick} className={styles.dropdownItem}>
                      Edit Profile
                    </button>
                    <button onClick={() => router.push("/settings")} className={styles.dropdownItem}>
                      Settings
                    </button>
                    <a href="/auth/logout" >Logout</a>
                  </div>
                )}
              </div>
            ) : (
              <li>
                <a href="/auth/login" >Login</a>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {false && (
        <div className={styles.profileWarning}>
          <p className="font-semibold">
            Your profile is incomplete. Please complete your details.
          </p>
          <button onClick={handleProfileClick} className={styles.profileButton}>
            Complete Profile
          </button>
        </div>
      )}
    </>
  );
}
