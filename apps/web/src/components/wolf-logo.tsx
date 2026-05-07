interface WolfLogoProps {
	className?: string;
}

export function WolfLogo({ className }: WolfLogoProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 512 512"
			className={className}
			aria-hidden="true"
		>
			<g transform="translate(256, 240) scale(5.2)">
				<path d="M-24 8 L-18 -30 L-8 -4Z" fill="#0FACED" />
				<path d="M-20 -2 L-18 -22 L-10 -4Z" fill="#091533" opacity="0.25" />
				<path d="M24 8 L18 -30 L8 -4Z" fill="#0FACED" />
				<path d="M20 -2 L18 -22 L10 -4Z" fill="#091533" opacity="0.25" />
				<path
					d="M-18 -18 L-24 8 L-22 16 L-14 24 L-6 28 L0 30 L6 28 L14 24 L22 16 L24 8 L18 -18 L8 -4 L0 -10 L-8 -4Z"
					fill="#0FACED"
				/>
				<path d="M0 -8 L-8 4 L0 0 L8 4Z" fill="#091533" opacity="0.15" />
				<ellipse cx="-10" cy="6" rx="4" ry="3.5" fill="#091533" />
				<circle cx="-9" cy="5" r="1.5" fill="#fff" />
				<ellipse cx="10" cy="6" rx="4" ry="3.5" fill="#091533" />
				<circle cx="11" cy="5" r="1.5" fill="#fff" />
				<path d="M-4 12 L0 10 L4 12" fill="none" stroke="#091533" strokeWidth="0.8" opacity="0.2" />
				<path d="M0 16 L-4 20 Q0 23 4 20Z" fill="#091533" />
				<path d="M0 22 L0 26" stroke="#091533" strokeWidth="1.2" strokeLinecap="round" />
				<path
					d="M-4 26 Q0 30 4 26"
					fill="none"
					stroke="#091533"
					strokeWidth="1"
					strokeLinecap="round"
				/>
				<path
					d="M-14 18 L-18 14 L-16 20"
					fill="none"
					stroke="#091533"
					strokeWidth="0.7"
					opacity="0.2"
					strokeLinecap="round"
				/>
				<path
					d="M14 18 L18 14 L16 20"
					fill="none"
					stroke="#091533"
					strokeWidth="0.7"
					opacity="0.2"
					strokeLinecap="round"
				/>
			</g>
		</svg>
	);
}
