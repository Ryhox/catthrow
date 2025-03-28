gsap.registerPlugin(Draggable);

document.addEventListener("DOMContentLoaded", () => {
  const cat = document.querySelector('.cat');
  
  // Create bounce counter with improved styling
  const bounceCounter = document.createElement('div');
  Object.assign(bounceCounter.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    fontSize: '24px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff',
    textShadow: '1px 1px 3px #000000',
    zIndex: '1000',
    opacity: '0',
    pointerEvents: 'none',
    userSelect: 'none',
    webkitUserSelect: 'none',
    msUserSelect: 'none',
    transition: 'opacity 0.5s ease'
  });
  bounceCounter.textContent = 'Bounces: 0';
  document.body.appendChild(bounceCounter);
  
  let bounceCount = 0;
  let hasBounced = false;
  const MIN_BOUNCE_VELOCITY = 150;
  let resizeTimeout;
  let prevWindowWidth = window.innerWidth;
  let prevWindowHeight = window.innerHeight;
  
  // Original dimensions and offsets
  const originalCatWidth = cat.offsetWidth;
  const originalCatHeight = cat.offsetHeight;
  const originalGroundOffset = 10; 
  const originalRightMargin = 320;

  const RAF = requestAnimationFrame;
  const CAF = cancelAnimationFrame;

  // Function to update scaling and dimensions
  const updateScaling = () => {
    const widthRatio = window.innerWidth / 1200;
    const heightRatio = window.innerHeight / 800;
    const scaleFactor = Math.min(1, Math.max(0.3, Math.min(widthRatio, heightRatio)));
    
    gsap.set(cat, { 
      scale: scaleFactor,
      transformOrigin: "0 0",
      force3D: true
    });

    return {
      width: originalCatWidth * scaleFactor,
      height: originalCatHeight * scaleFactor,
      rightMargin: originalRightMargin * scaleFactor,
      scale: scaleFactor
    };
  };

  // Initial setup
  let { width: catWidth, height: catHeight, rightMargin, scale: currentScale } = updateScaling();
  let groundY = Math.max(0, window.innerHeight - catHeight - originalGroundOffset);
  
  gsap.set(cat, {
    x: Math.min(window.innerWidth - catWidth - rightMargin, window.innerWidth - catWidth),
    y: groundY,
    rotation: 0
  });

  // Physics system variables
  let velocityX = 0;
  let velocityY = 0;
  let isDragging = false;
  let lastPosition = { x: gsap.getProperty(cat, "x"), y: gsap.getProperty(cat, "y") };
  let lastTime = Date.now();
  let animationId;

  // Physics constants
  const PHYSICS = {
    gravity: 2000,
    airResistance: 0.97,
    groundBounce: 0.7,
    rotationFactor: 0.1
  };

  const draggable = Draggable.create(cat, {
    type: "x,y",
    bounds: {
      minX: 0,
      maxX: window.innerWidth - catWidth,
      minY: 0,
      maxY: groundY
    },
    inertia: false,
    onPress: () => {
      isDragging = true;
      CAF(animationId);
      gsap.killTweensOf(cat);
      lastPosition = {
        x: gsap.getProperty(cat, "x"),
        y: gsap.getProperty(cat, "y")
      };
      lastTime = Date.now();
    },
    onDrag: () => {
      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000;
      const currentX = gsap.getProperty(cat, "x");
      const currentY = gsap.getProperty(cat, "y");

      velocityX = (currentX - lastPosition.x) / deltaTime;
      velocityY = (currentY - lastPosition.y) / deltaTime;

      lastPosition = { x: currentX, y: currentY };
      lastTime = now;

      const rotation = Math.min(30, Math.max(-30, velocityX * PHYSICS.rotationFactor));
      gsap.to(cat, { rotation, duration: 0.2, overwrite: true });
    },
    onRelease: () => {
      isDragging = false;
      animationId = RAF(animatePhysics);
    }
  })[0];

  function animatePhysics() {
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    if (!isDragging) {
      // Apply physics
      velocityY += PHYSICS.gravity * deltaTime;
      velocityX *= PHYSICS.airResistance;
      velocityY *= PHYSICS.airResistance;

      // Calculate new position
      let newX = gsap.getProperty(cat, "x") + velocityX * deltaTime;
      let newY = gsap.getProperty(cat, "y") + velocityY * deltaTime;

      // Check for bounces
      let bounced = false;
      let verticalBounce = false;

      // Horizontal boundaries
      if (newX < 0 || newX > window.innerWidth - catWidth) {
        newX = Math.max(0, Math.min(newX, window.innerWidth - catWidth));
        velocityX *= -PHYSICS.groundBounce;
        bounced = true;
      }

      // Vertical boundaries
      if (newY > groundY) {
        newY = groundY;
        velocityY *= -PHYSICS.groundBounce;
        velocityX *= 0.9;
        bounced = true;
        verticalBounce = true;
      } else if (newY < 0) {
        newY = 0;
        velocityY *= -0.6;
        bounced = true;
        verticalBounce = true;
      }

      if (bounced) {
        const isSignificantBounce = verticalBounce 
            ? Math.abs(velocityY) > MIN_BOUNCE_VELOCITY
            : Math.abs(velocityX) > MIN_BOUNCE_VELOCITY;
        
        if (isSignificantBounce) {
            if (!hasBounced) {
                hasBounced = true;
                // Show permanently without animation
                bounceCounter.style.opacity = '1';
            }
            bounceCount++;
            
            // Kill only scale animations
            gsap.killTweensOf(bounceCounter, 'scale');
            
            // Update text immediately
            bounceCounter.textContent = `Bounces: ${bounceCount}`;
            
            // Simple, reliable animation
            const isMilestone = bounceCount % 10 === 0;
            gsap.from(bounceCounter, {
                scale: isMilestone ? 1.5 : 1.2,
                duration: isMilestone ? 0.8 : 0.3,
                ease: isMilestone ? "elastic.out(1, 0.3)" : "power2.out",
                overwrite: true
            });
        } 
      }

      // Update position
      gsap.set(cat, { x: newX, y: newY });

      // Update rotation
      const rotation = velocityX * PHYSICS.rotationFactor + velocityY * 0.05;
      gsap.to(cat, {
        rotation: Math.min(45, Math.max(-45, rotation)),
        duration: 0.3,
        overwrite: true
      });

      if (Math.abs(velocityX) > 10 || Math.abs(velocityY) > 10 || newY < groundY) {
        animationId = RAF(animatePhysics);
      } else {
        gsap.to(cat, {
          y: groundY,
          rotation: 0,
          duration: 0.5,
          ease: "bounce.out",
          overwrite: true
        });
      }
    }
  }

  // Enhanced resize handler
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Update dimensions
      const { width, height, rightMargin, scale } = updateScaling();
      const newGroundY = Math.max(0, window.innerHeight - height - originalGroundOffset);
      
      // Calculate position preservation ratios
      const xRatio = gsap.getProperty(cat, "x") / prevWindowWidth;
      const yRatio = gsap.getProperty(cat, "y") / prevWindowHeight;

      // Calculate new positions
      let newX = Math.min(
        window.innerWidth - width - rightMargin,
        window.innerWidth * xRatio
      );
      let newY = Math.min(
        newGroundY,
        window.innerHeight * yRatio
      );

      // Apply boundaries
      newX = Math.max(0, Math.min(newX, window.innerWidth - width));
      newY = Math.max(0, Math.min(newY, newGroundY));

      // Update dimensions
      catWidth = width;
      catHeight = height;
      groundY = newGroundY;

      // Update draggable bounds
      draggable.applyBounds({
        minX: 0,
        maxX: window.innerWidth - catWidth,
        minY: 0,
        maxY: groundY
      });

      // Adjust velocity for scaling
      const scaleRatio = scale / currentScale;
      velocityX *= scaleRatio;
      velocityY *= scaleRatio;
      currentScale = scale;

      // Update position
      gsap.set(cat, { x: newX, y: newY });

      prevWindowWidth = window.innerWidth;
      prevWindowHeight = window.innerHeight;

      if (newY < groundY && !isDragging) {
        CAF(animationId);
        animationId = RAF(animatePhysics);
      }
    }, 100);
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);

  window.addEventListener('beforeunload', () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
    CAF(animationId);
  });
});