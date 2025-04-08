// components/HeroImageScroller.tsx
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import styles from './components.module.css/HeroImageScroller.module.css'

const imageNames = [
  'church.jpg',
  'church2.jpg',
  'church3.jpg',
  'church4.jpg',
  'church5.jpg'
]

export default function HeroImageScroller() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % imageNames.length)
    }, 3000) // every 3 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={styles.heroWrapper}>
      <div
        className={styles.sliderContainer}
        style={{
          transform: `translateX(-${currentIndex * 100}%)`
        }}
      >
        {imageNames.map((name, index) => (
          <div key={index} className={styles.imageWrapper}>
            <Image
              src={`/images/gallery/${name}`}
              alt={`Church image ${index + 1}`}
              layout="fill"
              objectFit="cover"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      <div className={styles.imageOverlay}></div>

      <div className={styles.heroContent}>
        <h2 className="text-4xl font-extrabold">Welcome to Our Church App</h2>
        <p className="mt-4 text-lg">Empowering churches with tools for better management and engagement.</p>
        <a
          href="#features"
          className="mt-6 inline-block bg-yellow-500 text-black font-semibold px-6 py-3 rounded shadow hover:bg-yellow-400"
        >
          Explore Features
        </a>
      </div>
    </div>
  )
}
