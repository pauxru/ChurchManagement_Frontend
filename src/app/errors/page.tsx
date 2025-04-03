import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const PageNotFound: React.FC = () => {
  const router = useRouter();

  const handleRetry = () => {
    router.reload(); // Reloads the current page
  };

  return (
    <>
      <Head>
        <title>404 - Page Not Found</title>
        <meta name="description" content="The page you are looking for is not available." />
      </Head>
      <div style={styles.container}>
        <h1 style={styles.title}>404</h1>
        <p style={styles.message}>
          Oops! The service you are looking for is currently unavailable or does not exist.
        </p>
        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={() => router.push('/')}>
            Go Back Home
          </button>
          <button style={styles.retryButton} onClick={handleRetry}>
            Retry
          </button>
        </div>
      </div>
    </>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    textAlign: 'center' as const,
    backgroundColor: '#f0f2f5',
    color: '#212529',
    fontFamily: "'Roboto', sans-serif",
    padding: '0 20px',
  },
  title: {
    fontSize: '8rem',
    fontWeight: '700',
    color: '#343a40',
    margin: '0',
    textShadow: '2px 2px 5px rgba(0, 0, 0, 0.1)',
  },
  message: {
    fontSize: '1.25rem',
    margin: '20px 0',
    color: '#6c757d',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
  },
  button: {
    padding: '12px 24px',
    fontSize: '1rem',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  retryButton: {
    padding: '12px 24px',
    fontSize: '1rem',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  buttonHover: {
    backgroundColor: '#0056b3',
  },
};

export default PageNotFound;
