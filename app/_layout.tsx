import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuthStore } from '@/lib/auth/store';
import { View, ActivityIndicator, Text, AppState, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const {
    initialize,
    initialized,
    session,
    userProfile,
    loading,
    refreshSession,
    setAppResuming,
    isAppResuming,
    pendingModalPath,
    setPendingModalPath,
  } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  // Refs pour le listener AppState afin d'avoir les valeurs à jour
  const appStateRef = useRef(AppState.currentState);
  // pathnameRef n'est plus nécessaire pour le useEffect principal, mais toujours pour AppState listener
  const pathnameRef = useRef(pathname); 

  const [isNavigating, setIsNavigating] = useState(false);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Initialize authentication when app starts
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle navigation based on auth state
  useEffect(() => {
    let redirectLoginTimer: number | null = null;
    let resetNavigatingTimer: number | null = null;

    // Utiliser pathname directement ici au lieu de pathnameRef.current
    // loading, initialized, isNavigating, isAppResuming sont vérifiés
    if (loading || !initialized || isNavigating || isAppResuming) return;
    
    // currentPath est maintenant pathname
    const isInAuthGroup = segments[0] === '(auth)';
    const isModalRoute = pathname.startsWith('/modals');

    // User is authenticated if session and userProfile exist
    const isAuthenticated = session && userProfile;
    
    console.log(`[RootLayout NavCheck] Path: ${pathname}, Segments: ${JSON.stringify(segments)}, isAuthenticated: ${isAuthenticated}, isInAuthGroup: ${isInAuthGroup}, isModalRoute: ${isModalRoute}, loading: ${loading}, initialized: ${initialized}, isNavigating: ${isNavigating}, isAppResuming: ${isAppResuming}`);

    // Rediriger vers login SEULEMENT si:
    // 1. Non authentifié
    // 2. Pas dans le groupe (auth)
    // 3. Pas sur une route de modale (pour éviter de casser une restauration de modale)
    const shouldRedirectToLogin = !isAuthenticated && !isInAuthGroup && !isModalRoute;
    console.log(`[RootLayout NavCheck] Calculated shouldRedirectToLogin: ${shouldRedirectToLogin}`);
    
    if (shouldRedirectToLogin) {
      setIsNavigating(true);
      console.log(`RootLayout: User NOT authenticated (${isAuthenticated}), not in auth group (${isInAuthGroup}), not on modal route (${isModalRoute}). Path: ${pathname}. Conditions to redirect to login are MET.`);
      redirectLoginTimer = setTimeout(() => {
        console.log(`[!!! RootLayout REDIRECTING !!!] About to router.replace('/login'). Pathname at decision: ${pathname}, isAuthenticated: ${isAuthenticated}, isInAuthGroup: ${isInAuthGroup}, isModalRoute: ${isModalRoute}`);
        try {
          router.replace('/login');
        } catch (error) {
          console.error('RootLayout Navigation error:', error);
        } finally {
          resetNavigatingTimer = setTimeout(() => {
            setIsNavigating(false);
          }, 500); // Delay to ensure navigation completes
        }
      }, 0); // setTimeout to allow current render cycle to complete
    }

    return () => {
      if (redirectLoginTimer) clearTimeout(redirectLoginTimer);
      if (resetNavigatingTimer) clearTimeout(resetNavigatingTimer);
    };
  }, [session, userProfile, initialized, segments, router, isNavigating, loading, isAppResuming, pathname, setPendingModalPath, setIsNavigating]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const previousAppStateValue = appStateRef.current;
      appStateRef.current = nextAppState;

      const wasInactive = previousAppStateValue.match(/inactive|background/);
      const isActive = nextAppState === 'active';
      const isEnteringBackground = (nextAppState === 'inactive' || nextAppState === 'background') && previousAppStateValue === 'active';

      console.log(`AppState changed from ${previousAppStateValue} to ${nextAppState}`);

      if (isEnteringBackground) {
        const currentPath = pathnameRef.current;
        // Ne pas sauvegarder les routes d'authentification pour la restauration simple
        // Permettre la sauvegarde des routes de modales
        if (currentPath && !currentPath.startsWith('/(auth)')) {
          console.log(`[AppState] Saving path to AsyncStorage: ${currentPath}`);
          try {
            await AsyncStorage.setItem('lastKnownRoute', currentPath);
          } catch (e) { 
            console.error('[AppState] Failed to save path to AsyncStorage', e); 
          }
        }
      }

      if (wasInactive && isActive) {
        console.log('App has come to the foreground!');
        setAppResuming(true); // UI shows "Resuming..."

        await refreshSession(); // Call store's refreshSession

        console.log('[AppState] refreshSession call completed. Starting polling for auth state stabilization...');
        let attempts = 0;
        const maxAttempts = 50; // 50 * 200ms = 10 seconds timeout

        let sessionExists = !!useAuthStore.getState().session;
        let profileMissing = !useAuthStore.getState().userProfile;
        let authIsLoading = useAuthStore.getState().loading;

        while ( (authIsLoading || (sessionExists && profileMissing)) && attempts < maxAttempts) {
          if (authIsLoading) {
            console.log(`[AppState] Auth loading... (Attempt ${attempts + 1}/${maxAttempts})`);
          } else if (sessionExists && profileMissing) {
            console.log(`[AppState] Session exists, profile missing. Waiting for profile... (Attempt ${attempts + 1}/${maxAttempts})`);
          }
          await new Promise(resolve => setTimeout(resolve, 200)); // Scrututer toutes les 200ms
          attempts++;
          sessionExists = !!useAuthStore.getState().session;
          profileMissing = !useAuthStore.getState().userProfile;
          authIsLoading = useAuthStore.getState().loading;
        }

        if (attempts >= maxAttempts) {
            console.warn('[AppState] Max polling attempts reached. Auth state might be inconsistent.');
        } else {
            console.log('[AppState] Auth state stabilized (loading is false, and profile loaded if session exists).');
        }

        // Maintenant que l'état d'auth (session + profil) est stable, procéder à la restauration de la navigation
        let restoredNav = false;
        try {
          const savedPath = await AsyncStorage.getItem('lastKnownRoute');
          if (savedPath) {
            console.log(`[AppState] Found saved path: ${savedPath}`);
            await AsyncStorage.removeItem('lastKnownRoute'); // Consommer la route sauvegardée
            
            const { session: currentSession, userProfile: currentProfile, loading: storeLoading } = useAuthStore.getState();
            console.log(`[AppState NavRestore Check] Final auth state before restoring. Session: ${!!currentSession}, Profile: ${!!currentProfile}, StoreLoading: ${storeLoading}, Path: ${savedPath}`);

            if (currentSession && currentProfile && !storeLoading && savedPath && !savedPath.startsWith('/(auth)') && savedPath.length > 0) {
              setIsNavigating(true); // Indiquer qu'une opération de navigation initiée par AppState est en cours
              try {
                if (savedPath.startsWith('/modals')) {
                  console.log(`[AppState] Saved path is a modal. Replacing to /(tabs)/ first (deferred), then will set pendingModalPath to: ${savedPath}`);
                  setTimeout(() => {
                    try {
                      router.replace('/(tabs)/' as any); // Établir une base saine, cast pour type. Route vers le groupe.
                      setPendingModalPath(savedPath); // Laisser RootLayout PendingModalNav gérer le push
                    } catch (deferredNavError) {
                      console.error(`[AppState] Error during deferred router.replace or setPendingModalPath for ${savedPath}:`, deferredNavError);
                      setPendingModalPath(null); // Nettoyer en cas d'erreur
                      setIsNavigating(false); // Débloquer
                    }
                  }, 0); // Décaler pour laisser le temps au routeur de digérer les changements d'état
                } else {
                  console.log(`[AppState] Attempting to REPLACE non-modal navigation to: ${savedPath}`);
                  router.replace(savedPath as any);
                  // Pour les non-modales, on ne set pas pendingModalPath, la navigation est directe.
                  // isNavigating sera remis à false par le setTimeout global ci-dessous.
                }
                restoredNav = true; 
              } catch (navError) {
                console.error(`[AppState] Error during router.replace or setPendingModalPath for ${savedPath}:`, navError);
                // S'assurer de remettre isNavigating à false même en cas d'erreur ici pour débloquer
                setIsNavigating(false); 
              }
            } else {
              console.log(`[AppState] Conditions not met for restoring path OR auth lost/loading. Auth: ${!!(currentSession && currentProfile)}, StoreLoading: ${storeLoading}, Path: ${savedPath}. Will not set pendingModalPath or navigate.`);
              setPendingModalPath(null); // S'assurer qu'aucune modale n'est en attente
              setIsNavigating(false); // Débloquer si on ne fait rien
            }
          } else {
            // Pas de savedPath, donc on ne fait rien et on débloque isNavigating si on l'avait mis à true ailleurs (peu probable ici)
             setIsNavigating(false);
          }
        } catch (e) {
          console.error('[AppState] Failed to get or restore path from AsyncStorage', e);
          setIsNavigating(false); // Débloquer en cas d'erreur
        }
        
        setTimeout(() => {
          console.log(`[AppState] Setting isAppResuming to false after 1500ms delay (post-auth-load).`);
          setAppResuming(false);
          // Remettre isNavigating à false. Cette variable d'état (isNavigating) est locale à RootLayout.
          // Son rôle principal ici était de signaler aux autres useEffect de RootLayout (comme NavCheck)
          // de ne pas interférer pendant que AppState orchestrait la restauration.
          // Le useEffect de PendingModalNav a sa propre gestion de isNavigating pour son push.
          console.log('[AppState] Resetting isNavigating (local to RootLayout) to false.');
          setIsNavigating(false);
        }, 1500); 
      }
    });

    return () => {
      subscription.remove();
    };
  }, [setAppResuming, router, refreshSession, setPendingModalPath, setIsNavigating]);

  // Configure audio mode
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true, // Allow playback in silent mode on iOS
          allowsRecordingIOS: false,
          staysActiveInBackground: false, 
          interruptionModeIOS: 1, // Do not mix with other sounds
          shouldDuckAndroid: true, // Duck other sounds on Android
          interruptionModeAndroid: 1, // Do not mix with other sounds
          playThroughEarpieceAndroid: false,
        });
        console.log('Audio mode configured successfully (playsInSilentModeIOS: true).');
      } catch (error) {
        console.error('Failed to set audio mode:', error);
      }
    };

    configureAudio();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // NOUVEAU: useEffect pour gérer la navigation des modales en attente
  // Placé ici avec les autres hooks, AVANT les returns conditionnels
  useEffect(() => {
    // Ce useEffect gère la navigation vers une modale qui était ouverte
    // lorsque l'application a été mise en arrière-plan.

    if (pendingModalPath && !isAppResuming && initialized && !loading && session && userProfile) {
      // Les conditions sont remplies pour tenter d'ouvrir la modale.
      
      // Vérifier si une navigation est DÉJÀ considérée comme en cours par cet effet.
      // Normalement, isNavigating devrait être false ici si l'effet précédent a bien tout nettoyé.
      if (isNavigating) { 
        console.log(`[RootLayout PendingModalNav] SKIPPING push for ${pendingModalPath} because isNavigating is already true.`);
        // Si isNavigating est true, cela signifie qu'une tentative de navigation est en cours
        // ou que l'état n'a pas été correctement réinitialisé.
        // On ne fait rien pour éviter des push multiples.
        // L'état devrait se résoudre (isNavigating devrait redevenir false).
        return;
      }

      console.log(`[RootLayout PendingModalNav] Conditions MET. Attempting to PUSH modal from pendingModalPath: ${pendingModalPath}`);
      
      // Indiquer qu'une opération de navigation est en cours.
      // Cela peut bloquer d'autres logiques de navigation dans RootLayout.
      setIsNavigating(true);
      let navigationAttempted = false;

      try {
        router.push(pendingModalPath as any);
        navigationAttempted = true;
        console.log(`[RootLayout PendingModalNav] router.push(${pendingModalPath}) called.`);
      } catch (e) {
        console.error('[RootLayout PendingModalNav] Error pushing modal:', e);
        // En cas d'erreur, on essaie quand même de nettoyer.
      } finally {
        // Ce bloc s'exécute que le try ait réussi ou levé une exception (si elle n'a pas fait sortir de la fonction).
        console.log(`[RootLayout PendingModalNav] In finally. Navigation attempted: ${navigationAttempted}. Path: ${pendingModalPath}. Resetting states.`);
        
        // On nettoie le chemin de la modale en attente, car on a tenté de naviguer.
        setPendingModalPath(null);
        
        // Très important : remettre isNavigating à false pour débloquer d'autres logiques
        // et indiquer que cette tentative spécifique de navigation modale est terminée.
        setIsNavigating(false);
        console.log(`[RootLayout PendingModalNav] pendingModalPath set to null, isNavigating set to false.`);
      }
    }
    // Il n'y a plus de timer à nettoyer spécifiquement pour isNavigating ici.
    // isNavigating (l'état local) n'est PAS dans les dépendances de cet effet pour éviter des boucles
    // si setIsNavigating(true) puis setIsNavigating(false) dans le même cycle logique le redéclenchait.
    // L'effet est déclenché par les changements des états d'auth, de reprise de l'app, ou de pendingModalPath lui-même.
  }, [pendingModalPath, isAppResuming, initialized, loading, session, userProfile, router, setPendingModalPath, setIsNavigating]); // Garder setIsNavigating comme dépendance car c'est une fonction du hook useState.

  // NOUVEAU: Loader prioritaire si l'application reprend
  // Cette vérification doit se faire APRÈS l'appel de tous les hooks.
  if (isAppResuming) {
    console.log('RootLayout: App is resuming, showing ResumingScreen...');
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#021a19', // Même fond que les autres loaders
        }}
      >
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text
          style={{
            marginTop: 12,
            color: '#5eead4',
            // fontFamily: 'Inter-Regular', // Inter n'est peut-être pas encore chargé
            fontSize: 14,
          }}
        >
          Resuming...
        </Text>
      </View>
    );
  }

  // Show loading screen while fonts are loading OR auth is initializing OR if we are navigating
  if (!fontsLoaded || !initialized || loading || isNavigating) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#021a19',
        }}
      >
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text
          style={{
            marginTop: 12,
            color: '#5eead4',
            fontFamily: 'system-font',
            fontSize: 14,
          }}
        >
          Loading...
        </Text>
      </View>
    );
  }

  // If there's no session and we are not in the auth group,
  // display a loader while the redirection to login is happening.
  // This prevents a flash of the main app content.
  const inAuthGroup = segments[0] === '(auth)';
  // User is authenticated if session and userProfile exist
  const isAuthenticated = session && userProfile;

  // On vérifie aussi si l'app n'est pas en train de reprendre pour éviter un flash du loader de redirection
  if (!isAuthenticated && !inAuthGroup && !isAppResuming) {
    console.log('!!!!!!!!!!!!!! RootLayout: RENDERING REDIRECTING TO LOGIN LOADER !!!!!!!!!!!!!!');
    console.log(`Values: isAuthenticated: ${isAuthenticated}, inAuthGroup: ${inAuthGroup}, isAppResuming: ${isAppResuming}, pathname: ${pathname}`);
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#021a19',
        }}
      >
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text
          style={{
            marginTop: 12,
            color: '#5eead4',
            fontFamily: 'system-font', // Using a system font as Inter might not be loaded yet
            fontSize: 14,
          }}
        >
          Redirecting to login...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="(auth)" 
          options={{ 
            animation: 'fade',
          }}
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="modals"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
            headerShown: false,
            contentStyle: { backgroundColor: '#021a19' },
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}