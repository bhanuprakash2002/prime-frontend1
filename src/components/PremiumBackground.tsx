/**
 * Premium Background Component
 * 
 * Renders the floating orbs, noise texture, and grid overlay
 * that creates the premium visual effect for the background.
 * 
 * Usage: Place this component inside any container with `bg-gradient-hero` class
 */

const PremiumBackground = () => {
    return (
        <>
            {/* Floating Orbs Layer */}
            <div className="premium-bg-layer" aria-hidden="true">
                <div className="premium-orb-1" />
                <div className="premium-orb-2" />
                <div className="premium-orb-3" />
            </div>

            {/* Subtle Grid Pattern */}
            <div className="premium-grid" aria-hidden="true" />

            {/* Noise Texture Overlay */}
            <div className="premium-noise" aria-hidden="true" />
        </>
    );
};

export default PremiumBackground;
