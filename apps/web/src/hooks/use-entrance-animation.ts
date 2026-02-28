import { useState, useEffect } from "react";

const ANIMATION_CLASSES =
	"animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both";

interface AnimationProps {
	className: string;
	style: React.CSSProperties | undefined;
}

export function useEntranceAnimation(enabled = true) {
	const [hasAnimated, setHasAnimated] = useState(false);

	useEffect(() => {
		if (enabled && !hasAnimated) {
			const timer = setTimeout(() => setHasAnimated(true), 1200);
			return () => clearTimeout(timer);
		}
	}, [enabled, hasAnimated]);

	function getAnimationProps(index: number): AnimationProps {
		if (hasAnimated || !enabled) {
			return { className: "", style: undefined };
		}
		return {
			className: ANIMATION_CLASSES,
			style: { animationDelay: `${175 + index * 75}ms` },
		};
	}

	return { hasAnimated, getAnimationProps };
}
