import { useRef, useEffect, DependencyList, EffectCallback } from "react";

const usePrevious = (value: DependencyList, initialValue: DependencyList) => {
    const ref = useRef(initialValue);
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
};

export const useEffectDebugger = (effectHook: EffectCallback, dependencies: DependencyList, dependencyNames = []) => {
    const previousDeps = usePrevious(dependencies, []);

    const changedDeps = dependencies.reduce((accum, dependency, index) => {
        if (dependency !== previousDeps[index]) {
            const keyName = dependencyNames[index] || index;
            return {
                ...accum,
                [keyName]: {
                    before: previousDeps[index],
                    after: dependency
                }
            };
        }

        return accum;
    }, {});

    if (Object.keys(changedDeps).length) {
        console.log('[use-effect-debugger] ', changedDeps);
    }

    useEffect(effectHook, dependencies);
};