import styles from './Footer.module.css';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerSection}>
          <h3 className={styles.footerTitle}>About</h3>
          <p>
            A.I.P.C.A Church Management System helps streamline church activities,
            member records, transfers, and communication across all levels of the church.
          </p>
        </div>

        <div className={styles.footerSection}>
          <h3 className={styles.footerTitle}>Quick Links</h3>
          <Link href="/" className={styles.footerLink}>Home</Link>
          <Link href="/members/searchMembers" className={styles.footerLink}>Members</Link>
          <Link href="/localChurches/searchLocalChurch" className={styles.footerLink}>Churches</Link>
          <Link href="/events" className={styles.footerLink}>Events</Link>
          <Link href="/transfers" className={styles.footerLink}>Transfers</Link>
        </div>

        <div className={styles.footerSection}>
          <h3 className={styles.footerTitle}>Contact</h3>
          <p>Email: info@aipca.org</p>
          <p>Phone: +254 700 000000</p>
          <p>Head Office: Nairobi, Kenya</p>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>&copy; {new Date().getFullYear()} A.I.P.C.A Church Management System. All rights reserved.</p>
      </div>
    </footer>
  );
}
