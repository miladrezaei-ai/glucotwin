import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import App from './App';
import './index.css';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'eu-central-1_3w65EYBq1',
      userPoolClientId: '1jfeebgapk6err613p45e7lqcr',
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);