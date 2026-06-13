import { ReactElement, ReactNode } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { AppProps } from 'next/app';
import { AppCacheProvider } from '@mui/material-nextjs/v15-pagesRouter';
import { ThemeProvider } from '@mui/material/styles';
import { ThemeProvider as EmotionThemeProvider } from '@emotion/react';
import CssBaseline from '@mui/material/CssBaseline';
import { UI } from '@ganju/ui';

import { materialTheme } from '../theme';
import { globalStyles } from '../global-styles';

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

export interface MyAppProps extends AppProps {
  Component: NextPageWithLayout;
}

const MyApp = (props: MyAppProps) => {
  const { Component, pageProps } = props;

  const getLayout = Component.getLayout ?? (page => page);

  return (
    <AppCacheProvider {...props}>
      <Head>
        <meta
          name="viewport"
          content="initial-scale=1, width=device-width, maximum-scale=1, interactive-widget=resizes-content"
        />
        <link rel="icon" href="/ganju.png" />
        <title>Ganju.ai</title>
        <meta name="author" content="ganju.ai" />
        <meta
          name="keywords"
          content="ganju.ai, MCP, MCP-Server, MCP-Client, AI, ML, No code, No-code, NoCode"
        />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="theme-color" content="#FFFFFF" />
        <meta name="msapplication-TileColor" content="#FFFFFF" />
        <meta name="msapplication-TileImage" content="/ganju.png" />
        <meta name="application-name" content="ganju.ai" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="ganju.ai" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta
          name="description"
          content="Ganju.ai is a no-code tool for creating fast and scalable MCP servers."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://app.ganju.ai/" />
        <meta property="og:title" content="ganju.ai" />
        <meta
          property="og:description"
          content="Ganju.ai is a no-code tool for creating fast and scalable MCP servers."
        />
        <meta
          property="og:image"
          content="https://app.ganju.ai/background.png"
        />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://app.ganju.ai/" />
        <meta property="twitter:title" content="ganju.ai" />
        <meta property="twitter:description" content="" />
        <meta
          property="twitter:image"
          content="https://app.ganju.ai/background.png"
        />
      </Head>
      <div id="modal" />
      <ThemeProvider theme={materialTheme}>
        <EmotionThemeProvider theme={materialTheme}>
          {globalStyles}
          <CssBaseline />
          <UI.Alert.SnackbarProvider>
            <>{getLayout(<Component {...pageProps} />)}</>
          </UI.Alert.SnackbarProvider>
        </EmotionThemeProvider>
      </ThemeProvider>
    </AppCacheProvider>
  );
};

export default MyApp;
