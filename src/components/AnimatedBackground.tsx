export const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Gradient Orbs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      
      {/* Floating Geometric Shapes */}
      <div className="absolute top-1/4 left-1/4 w-16 h-16 border-2 border-primary/20 rounded-lg rotate-45 animate-float"></div>
      <div className="absolute top-3/4 right-1/4 w-20 h-20 border-2 border-purple-500/20 rounded-full animate-float animation-delay-2000"></div>
      <div className="absolute top-1/2 right-1/3 w-12 h-12 border-2 border-blue-500/20 animate-float animation-delay-4000"></div>
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(to right, rgb(99, 102, 241) 1px, transparent 1px),
                           linear-gradient(to bottom, rgb(99, 102, 241) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      ></div>
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-transparent to-background opacity-80"></div>
    </div>
  );
};
