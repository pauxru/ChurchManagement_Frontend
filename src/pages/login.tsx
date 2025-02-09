import React from 'react';

const LoginPage = () => {
  const handleSocialLogin = (provider: string) => {
    window.location.href = `api/custom-login?connection=${provider}`;
  };

  return (
    <div>
      <h1>Log In</h1>
      <form method="POST" action="api/custom-login">
        <label>
          Email:
          <input type="email" name="username" required />
        </label>
        <label>
          Password:
          <input type="password" name="password" required />
        </label>
        <button type="submit">Log In</button>
      </form>
      <h2>Or Log In with:</h2>
      <button onClick={() => handleSocialLogin('google')}>Google</button>
      <button onClick={() => handleSocialLogin('facebook')}>Facebook</button>
    </div>
  );
};

export default LoginPage;
