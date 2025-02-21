import React, { useState } from 'react';

const VideoPlayer = ({ videoUrl }) => {
  const [isLoading, setIsLoading] = useState(true);

  // Extract video ID from YouTube URL
  const getYouTubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getYouTubeVideoId(videoUrl);

  if (!videoId) {
    return <div>Invalid YouTube URL</div>;
  }

  return (
    <div className="video-section w-full max-w-5xl mx-auto">
      {/* Sound Notification Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center py-3 px-4 rounded-t-2xl font-medium tracking-wide shadow-lg">
        Make Sure Your Sound Is Turned ON! (Please Wait For Video To Fully Load)
      </div>

      {/* Video Container */}
      <div className="video-container relative w-full aspect-video bg-gradient-to-br from-blue-50 to-white rounded-b-2xl overflow-hidden shadow-xl">
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        )}
        
        {/* Video Player */}
        <div className="relative w-full h-full backdrop-blur-sm">
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&controls=1`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
          />
        </div>

        {/* Video Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-blue-900/20 to-transparent pointer-events-none" />
      </div>

      {/* Video Caption */}
      <div className="mt-4 text-center text-blue-600 text-sm font-medium">
        Click the play button to start the video
      </div>
    </div>
  );
};

export default VideoPlayer;
