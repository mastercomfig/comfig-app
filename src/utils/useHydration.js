const useHydration = (useBoundStore) => {
  const [hydrated, setHydrated] = useState(useBoundStore.persist.hasHydrated);

  useEffect(() => {
    const unsubHydrate = useBoundStore.persist.onHydrate(() =>
      setHydrated(false)
    ); // Note: this is just in case you want to take into account manual rehydrations. You can remove this if you don't need it/don't want it.
    const unsubFinishHydration = useBoundStore.persist.onFinishHydration(() =>
      setHydrated(true)
    );

    setHydrated(useBoundStore.persist.hasHydrated());

    return () => {
      unsubHydrate();
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
};

export default useHydration;
