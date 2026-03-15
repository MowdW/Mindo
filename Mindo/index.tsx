
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 模拟app对象，用于开发模式
const mockApp = {
  vault: {
    adapter: {
      getResourcePath: (path: string) => path
    }
  }
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App 
      onSave={(data) => console.log('Saved', data)} 
      fileName="Untitled"
      settings={{ aiProvider: 'gemini', aiBaseUrl: '', aiApiKey: '', aiModel: 'gemini-2.0-flash', imageSaveLocation: 'obsidian', imageFolderPath: '' }}
      onShowMessage={(msg) => alert(msg)}
      app={mockApp as any}
    />
  </React.StrictMode>
);
