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

// Basic LoadingScreen component
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#021a19' }}>
      <ActivityIndicator size="large" color="#14b8a6" />
      <Text style={{ marginTop: 12, color: '#5eead4', fontFamily: 'Inter-Regular', fontSize: 14 }}>
        Loading...
      </Text>
    </View>
  );
}

// Basic ResumingScreen component
function ResumingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#021a19' }}>
      <ActivityIndicator size="large" color="#14b8a6" />
      <Text style={{ marginTop: 12, color: '#5eead4', fontFamily: 'Inter-Regular', fontSize: 14 }}>
        Resuming...
      </Text>
    </View>
  );
}

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
  const pathnameRef = useRef(pathname); // Garde une référence au pathname
  const segmentsRef = useRef(segments); // NOUVELLE REF pour les segments

  // Log pour suivre pathname et pathnameRef au début du render de RootLayout
  // console.log(`[RootLayout RENDER] Pathname: ${pathname}, PathnameRef Current: ${pathnameRef.current}`);

  const [isNavigating, setIsNavigating] = useState(false);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  
  useEffect(() => {
    pathnameRef.current = pathname; // Mettre à jour la réf lorsque le pathname change
    // console.log(`[RootLayout PathnameEffect] Pathname updated to: ${pathname}, PathnameRef updated to: ${pathnameRef.current}`);
  }, [pathname]);

  // NOUVEAU useEffect pour mettre à jour segmentsRef
  useEffect(() => {
    segmentsRef.current = segments;
    // console.log(`[RootLayout SegmentsEffect] Segments updated, SegmentsRef updated to: ${JSON.stringify(segmentsRef.current)}`);
  }, [segments]);
  
  // Initialize authentication when app starts
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle navigation based on auth state
  useEffect(() => {
    // console.log(`[RootLayout NavCheck EFFECT EVAL] Path: ${pathname}, Initialized: ${initialized}, Loading (store): ${loading}, Session: ${!!session}, UserProfile: ${!!userProfile}, isNavigating: ${isNavigating}, isAppResuming: ${isAppResuming}`);
    let redirectLoginTimer: number | null = null;
    let resetNavigatingTimer: number | null = null;

    // Utiliser pathname directement ici au lieu de pathnameRef.current
    // loading, initialized, isNavigating, isAppResuming sont vérifiés
    if (loading || !initialized || isNavigating || isAppResuming) {
      return;
    }
    
    // currentPath est maintenant pathname
    const isInAuthGroup = segments[0] === '(auth)';
    const isModalRoute = pathname.startsWith('/modals');

    // User is authenticated if session and userProfile exist
    const isAuthenticated = session && userProfile;
    
    // console.log(`[RootLayout NavCheck] Path: ${pathname}, Segments: ${JSON.stringify(segments)}, isAuthenticated: ${isAuthenticated}, isInAuthGroup: ${isInAuthGroup}, isModalRoute: ${isModalRoute}, loading: ${loading}, initialized: ${initialized}, isNavigating: ${isNavigating}, isAppResuming: ${isAppResuming}`);
    // if (__DEV__) console.log(`[RootLayout NavCheck_EFFECT_PRE_REDIRECT_LOGIC] Path: ${pathname}, Segments: ${JSON.stringify(segments)}, isAuthenticated: ${isAuthenticated}, isInAuthGroup: ${isInAuthGroup}, isModalRoute: ${isModalRoute}`);

    // Rediriger vers login SEULEMENT si:
    // 1. Non authentifié
    // 2. Pas dans le groupe (auth)
    // 3. Pas sur une route de modale (pour éviter de casser une restauration de modale)
    const shouldRedirectToLogin = !isAuthenticated && !isInAuthGroup && !isModalRoute;
    // console.log(`[RootLayout NavCheck] Calculated shouldRedirectToLogin: ${shouldRedirectToLogin}`);
    // if (__DEV__) console.log(`[RootLayout NavCheck_EFFECT_SHOULD_REDIRECT_LOGIN] shouldRedirectToLogin: ${shouldRedirectToLogin}, Path: ${pathname}`);
    
    if (shouldRedirectToLogin) {
    setIsNavigating(true);
      // if (__DEV__) console.log(`[RootLayout NavCheck_EFFECT_SET_IS_NAVIGATING_TRUE] Path: ${pathname}, Now isNavigating: true`);
    
      // Appel direct de router.replace
      // if (__DEV__) console.log(`[RootLayout NavCheck_EFFECT_IMMEDIATE_REPLACE_TO_LOGIN] Path: ${pathname}, Segments: ${JSON.stringify(segments)}, isAuthenticated: ${isAuthenticated}, isInAuthGroup: ${isInAuthGroup}, isModalRoute: ${isModalRoute}`);
      try {
          router.replace('/login');
      } catch (error) {
        // if (__DEV__) console.error('[RootLayout NavCheck_EFFECT_REPLACE_ERROR]', error, `Path: ${pathname}`);
      }

      // Timer pour remettre isNavigating à false après un délai pour laisser la navigation se faire
      resetNavigatingTimer = setTimeout(() => {
        // if (__DEV__) console.log(`[RootLayout NavCheck_EFFECT_FINALLY_SET_IS_NAVIGATING_FALSE] Path: ${pathname}, Segments: ${JSON.stringify(segments)}, Resetting isNavigating from true to false.`);
        setIsNavigating(false);
      }, 750); // Délai augmenté pour plus de marge

    }

    return () => {
      // if (redirectLoginTimer) clearTimeout(redirectLoginTimer); // redirectLoginTimer n'est plus utilisé
      if (resetNavigatingTimer) clearTimeout(resetNavigatingTimer);
    };
  }, [session, userProfile, initialized, segments, router, isNavigating, loading, isAppResuming, pathname, setPendingModalPath, setIsNavigating]);

  // Handle app state changes
  useEffect(() => {
    // console.log('[RootLayout AppStateEffect] Setting up AppState listener.');
    const appState = AppState.currentState;
    const appStateRef = { current: appState };
    let savedPath: string | null = null; // Déclarer savedPath ici

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // LOG AJOUTÉ : Début du listener
      // Log avec pathnameRef ET segmentsRef
      // console.log(`[AppState Listener START] Current state: ${appStateRef.current}, Next state: ${nextAppState}, PathnameRef: ${pathnameRef.current}, SegmentsRef: ${JSON.stringify(segmentsRef.current)}`);

      // Capture pathnameRef.current au moment où l'événement se produit,
      // mais pour la sauvegarde en arrière-plan, nous le relirons à l'intérieur du setTimeout.
      // const currentPathForListener = pathnameRef.current; 

      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // NOUVELLE CONDITION : Ignorer si on revient sur une page d'auth (utilise segmentsRef)
        if (segmentsRef.current[0] === '(auth)') { 
            // console.log(`[AppState Listener] Coming to foreground on AUTH screen (Segments: ${JSON.stringify(segmentsRef.current)}). IGNORING resume logic.`);
            // Mettre à jour l'état immédiatement sans déclencher la logique de reprise
            appStateRef.current = nextAppState; 
            return; // Ne pas exécuter le reste (setAppResuming, refreshSession, etc.)
        }
        
        // console.log(`[AppState Listener] App coming to foreground. Pathname: ${pathnameRef.current}, Segments: ${JSON.stringify(segmentsRef.current)}`); // LOG AJOUTÉ (avec segments)
        // console.log('[AppState Listener] Setting isAppResuming = true'); // LOG AJOUTÉ
        setAppResuming(true); // UI shows "Resuming..."

        await refreshSession(); // Call store's refreshSession

        // console.log('[AppState] refreshSession call completed. Starting polling for auth state stabilization...');
        let attempts = 0;
        const maxAttempts = 20; // Approx 5 seconds (20 * 250ms)
        let authReady = false;

        while (attempts < maxAttempts) {
          const { session: currentSession, userProfile: currentProfile, loading: storeLoading } = useAuthStore.getState();
          const sessionExists = !!currentSession;
          const profileExists = !!currentProfile;
          const isAuthProcessLoading = storeLoading; // Reflects loading state from useAuthStore

          // console.log(`[AppState Polling attempt ${attempts + 1}] Session: ${sessionExists}, Profile: ${profileExists}, StoreLoading: ${isAuthProcessLoading}`);

          if (!isAuthProcessLoading && ((sessionExists && profileExists) || !sessionExists)) {
            // console.log('[AppState Polling] Auth state stabilized.');
            authReady = true;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 250));
          attempts++;
        }

        if (!authReady) {
          // console.warn('[AppState Polling] Auth state did not stabilize after maximum attempts. Proceeding with caution.');
        }

        // Maintenant que l'état d'auth (session + profil) est stable, procéder à la restauration de la navigation
        let restoredNav = false;
        try {
          savedPath = await AsyncStorage.getItem('lastKnownRoute'); // Utiliser la variable déclarée plus haut
          // LOG AJOUTÉ : Route lue depuis AsyncStorage
          // console.log(`[AppState Listener] Read from AsyncStorage - savedPath: ${savedPath}`);
          if (savedPath) {
            // console.log(`[AppState] Found saved path: ${savedPath}`);
            await AsyncStorage.removeItem('lastKnownRoute'); // Consommer la route sauvegardée
            
            const { session: currentSessionAfterPoll, userProfile: currentProfileAfterPoll } = useAuthStore.getState();
            
            if (currentSessionAfterPoll && currentProfileAfterPoll) { // Only restore if authenticated
              // console.log(`[AppState] User is authenticated. Proceeding with navigation restore to: ${savedPath}`);
              setIsNavigating(true); // Indiquer qu'une opération de navigation initiée par AppState est en cours
              try {
                if (savedPath.startsWith('/modals')) {
                  // console.log(`[AppState] Saved path is a modal. Replacing to /(tabs)/ first (deferred), then will set pendingModalPath to: ${savedPath}`);
                  setTimeout(() => {
                    try {
                      router.replace('/(tabs)/' as any); // Établir une base saine, cast pour type. Route vers le groupe.
                      setPendingModalPath(savedPath); // Laisser RootLayout PendingModalNav gérer le push
                    } catch (deferredNavError) {
                      // console.error('[AppState] Error during deferred replace to /(tabs)/ for modal restore:', deferredNavError);
                    } finally {
                      // console.log("[AppState] Deferred navigation for modal setup finished, setting isNavigating to false inside setTimeout");
                      // setIsNavigating(false); // Réinitialiser dans le finally du setTimeout de la modale
                    }
                  }, 0); // Différer légèrement pour laisser le routeur s'initialiser
                } else {
                  // console.log(`[AppState] Attempting to REPLACE non-modal navigation to: ${savedPath}`);
                  router.replace(savedPath as any);
                  // console.log("[AppState] Non-modal navigation finished, setting isNavigating to false after replace");
                  // setIsNavigating(false); // Réinitialiser après la navigation non-modale
                }
                restoredNav = true;
              } catch (e) {
                // console.error('[AppState] Error restoring navigation:', e);
                // console.log("[AppState] Error during navigation, setting isNavigating to false in catch block");
                // setIsNavigating(false);
              } finally {
                // console.log("[AppState] Main navigation block finished (try/catch/finally). isNavigating will be reset by specific paths or PendingModalNav effect.");
                // Ne pas mettre setIsNavigating(false) ici aveuglément, 
                // car pour les modales, c'est géré par le useEffect de pendingModalPath
                // et pour les non-modales, on pourrait le mettre après router.replace si besoin de finesse.
                // L'état isNavigating est principalement pour le useEffect de RootLayout et PendingModalNav
              }
            } else {
              // console.log('[AppState] User NOT authenticated after polling. Not restoring saved path. Will redirect to login or stay in auth flow.');
              // Si l'utilisateur n'est plus authentifié, on ne restaure pas le chemin et on laisse la logique de redirection principale faire son travail.
              // On pourrait vouloir nettoyer le pendingModalPath ici aussi si une modale était en attente et que l'utilisateur n'est plus loggué.
              if (savedPath.startsWith('/modals')) {
                // console.log('[AppState] Clearing pendingModalPath because user is no longer authenticated.');
                setPendingModalPath(null);
              }
            }
          } else {
            // console.log('[AppState] No saved path found in AsyncStorage.');
          }
        } catch (e) {
          // console.error('[AppState] Error reading lastKnownRoute from AsyncStorage:', e);
        } finally {
          // console.log(`[AppState] Finished attempting to restore navigation. Restored: ${restoredNav}. Setting isAppResuming to false.`);
          // Le setAppResuming(false) est retardé pour masquer les changements d'écran
          // Il faut s'assurer que isNavigating est remis à false APRÈS que la navigation (si elle a eu lieu) soit terminée.
          // Pour les modales, le useEffect de pendingModalPath s'en charge.
          // Pour les non-modales, si router.replace est asynchrone, il faudrait un await ou un .then()
          
          // Si une navigation a été tentée (pour une route non modale) ou si aucune navigation n'a été restaurée, 
          // on peut potentiellement remettre isNavigating à false ici,
          // mais avec précaution pour ne pas interférer avec l'effet de pendingModalPath.
          if (!savedPath || (savedPath && !savedPath.startsWith('/modals'))) {
             // console.log("[AppState Listener] Final isNavigating reset for non-modal or no saved path scenario."); // LOG AJOUTÉ
             setIsNavigating(false);
          }
          
          // console.log('[AppState Listener] Scheduling setAppResuming(false) in 1500ms'); // LOG AJOUTÉ
          setTimeout(() => {
            // console.log('[AppState Listener] Executing delayed setAppResuming(false)'); // LOG AJOUTÉ
            setAppResuming(false)
          }, 1500);
        }
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // console.log(`[AppState Listener] App going to background/inactive. Pathname: ${pathnameRef.current}. Scheduling save check.`); // LOG AJOUTÉ
        // Augmenter le délai pour donner plus de temps à la navigation de se stabiliser
        // et pour permettre à 'lastKnownRouteOverride' d'être potentiellement défini par une modale qui se ferme.
        setTimeout(async () => {
          // LOG AJOUTÉ : Début du check de sauvegarde
          // console.log(`[AppState Listener Save Check] Checking path to save. Current pathnameRef: ${pathnameRef.current}`);
          let pathToSave = null;
          const overridePath = await AsyncStorage.getItem('lastKnownRouteOverride');

          if (overridePath) {
            // console.log(`[AppState] Found override path: ${overridePath}. Using it to save lastKnownRoute.`);
            pathToSave = overridePath;
            await AsyncStorage.removeItem('lastKnownRouteOverride'); // Consommer l'override
          } else {
            // Pas d'override, utiliser la valeur actuelle de pathnameRef
            pathToSave = pathnameRef.current;
            // console.log(`[AppState] No override path. Using current pathnameRef: ${pathToSave}`);
          }

          if (pathToSave && !pathToSave.startsWith('/(auth)')) {
            // console.log(`[AppState Listener Save Check] SAVING lastKnownRoute: ${pathToSave}`); // LOG AJOUTÉ
            await AsyncStorage.setItem('lastKnownRoute', pathToSave);
          } else {
            // console.log(`[AppState Listener Save Check] NOT saving path: ${pathToSave} (null or auth route)`); // LOG AJOUTÉ
          }
        }, 300); // Délai augmenté à 300ms
      }
      // LOG AJOUTÉ : Fin du listener, mise à jour de appStateRef
      // console.log(`[AppState Listener END] Updating appStateRef from ${appStateRef.current} to ${nextAppState}`);
      appStateRef.current = nextAppState;
    });

    return () => {
      // console.log('[RootLayout AppStateEffect] Cleaning up AppState listener.');
      subscription.remove();
    };
  }, [router, refreshSession, setAppResuming, setPendingModalPath, setIsNavigating]); // pathnameRef n'est pas une dépendance pour éviter les cycles

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
        // console.log('Audio mode configured successfully (playsInSilentModeIOS: true).');
      } catch (error) {
        // console.error('Failed to set audio mode:', error);
      }
    };

    configureAudio();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
    // console.log(`[RootLayout FontsEffect] Fonts loaded: ${fontsLoaded}`);
  }, [fontsLoaded]);

  // NOUVEAU: useEffect pour gérer la navigation des modales en attente
  // Placé ici avec les autres hooks, AVANT les returns conditionnels
  useEffect(() => {
    // console.log(`[RootLayout PendingModalNav EFFECT EVAL] pendingModalPath: ${pendingModalPath}, isAppResuming: ${isAppResuming}, initialized: ${initialized}, loading: ${loading}, isNavigating (local): ${isNavigating}, session: ${!!session}, userProfile: ${!!userProfile}`);
    
    if (pendingModalPath && !isAppResuming && initialized && !loading && session && userProfile) {
      if (isNavigating) { 
        // console.log(`[RootLayout PendingModalNav] Navigation BLOCKED because isNavigating is already true. Pending: ${pendingModalPath}`);
        return; // Si une navigation est déjà en cours, attendre qu'elle se termine.
      }
      // console.log(`[RootLayout PendingModalNav] Attempting to PUSH modal from pendingModalPath: ${pendingModalPath}`);
      setIsNavigating(true);
      try {
        router.push(pendingModalPath as any);
        // On ne nettoie pas pendingModalPath ici, on le laisse pour que si l'utilisateur
        // remet l'app en arrière-plan pendant que la modale est ouverte, le AppState listener
        // puisse le voir et le sauvegarder correctement.
        // Il sera nettoyé par AppState listener au prochain foregrounding S'IL est consommé,
        // ou si la modale est fermée manuellement et que 'lastKnownRouteOverride' est utilisé.
        // setPendingModalPath(null); // NON: Ne pas nettoyer ici.
      } catch (e) {
        // console.error("[RootLayout PendingModalNav] Error pushing modal:", e);
        setPendingModalPath(null); // Nettoyer en cas d'erreur pour ne pas boucler.
      } finally {
        // console.log("[RootLayout PendingModalNav] PUSH attempt finished. Resetting isNavigating to false.");
        setIsNavigating(false); // Remettre à false que la navigation ait réussi ou échoué
      }
    } else {
        // console.log(`[RootLayout PendingModalNav EFFECT EVAL] Conditions NOT MET or no pendingModalPath. Values - pendingModalPath: ${pendingModalPath}, isAppResuming: ${isAppResuming}, initialized: ${initialized}, loading: ${loading}, isNavigating: ${isNavigating}, session: ${!!session}, userProfile: ${!!userProfile}`);
    }
  }, [pendingModalPath, isAppResuming, initialized, loading, session, userProfile, router, setIsNavigating, isNavigating]); // Ajout de isNavigating ici.

  // NOUVEAU: Effet pour nettoyer pendingModalPath si on quitte une modale restaurée
  useEffect(() => {
    // console.log(`[RootLayout ClearPendingModalPathIfNavigatedAway EFFECT EVAL] Pathname: ${pathname}, PendingModalPath: ${pendingModalPath}, IsAppResuming: ${isAppResuming}`);
    if (!isAppResuming && pendingModalPath && pathname && !pathname.startsWith('/modals')) {
      // console.log(`[RootLayout ClearPendingModalPathIfNavigatedAway] Pathname (${pathname}) is not a modal, but pendingModalPath (${pendingModalPath}) was set. Clearing pendingModalPath. IsAppResuming: ${isAppResuming}`);
      setPendingModalPath(null);
    }
  }, [pathname, pendingModalPath, setPendingModalPath, isAppResuming]); // Ajout de isAppResuming ici

  // This hook will protect from navigation problems if the user is not yet authenticated
  // It will also serve as the splash screen via the SegmentProvider
  if (!initialized || !fontsLoaded || loading) {
    // console.log(`RootLayout: RENDERING LOADING SCREEN (initialized: ${initialized}, fontsLoaded: ${fontsLoaded}, loading: ${loading})`);
    return <LoadingScreen />;
  }

  // Show "Resuming..." screen if the app is resuming and not yet ready to show content.
  // Prioritize this over the "Redirecting to login..." loader.
  if (isAppResuming) {
    // console.log('!!!!!!!!!!!!!! RootLayout: RENDERING RESUMING SCREEN !!!!!!!!!!!!!!');
    return <ResumingScreen />;
  }

  // If the user is not authenticated and not in the auth group, and app is NOT resuming,
  // display a loader while the redirection to login is happening.
  // This prevents a flash of the main app content.
  const inAuthGroup = segments[0] === '(auth)';
  // User is authenticated if session and userProfile exist
  const isAuthenticated = session && userProfile;

  // On vérifie aussi si l'app n'est pas en train de reprendre pour éviter un flash du loader de redirection
  if (!isAuthenticated && !inAuthGroup && !isAppResuming) {
    // console.log('!!!!!!!!!!!!!! RootLayout: RENDERING REDIRECTING TO LOGIN LOADER !!!!!!!!!!!!!!');
    // console.log(`Values: isAuthenticated: ${isAuthenticated}, inAuthGroup: ${inAuthGroup}, isAppResuming: ${isAppResuming}, pathname: ${pathname}`);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#021a19' }}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text
          style={{
            marginTop: 12,
            color: '#5eead4',
            fontFamily: 'system-font',
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