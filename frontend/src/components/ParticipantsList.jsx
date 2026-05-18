import { useState } from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const getAvatarColor = (name) => {
  const colors = [
    '#007ACC', '#FF6B6B', '#4ECDC4', '#45B7D1',
    '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

export default function ParticipantsList({ participants, currentUserId }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      {/* Participant Avatars */}
      <div 
        className="flex items-center gap-2 cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Users className="h-4 w-4 text-gray-400" />
        <div className="flex -space-x-2">
          {participants.slice(0, 5).map((participant) => (
            <div
              key={participant._id}
              className="w-8 h-8 rounded-full border-2 border-gray-700 flex items-center justify-center text-xs font-bold text-white relative"
              style={{ backgroundColor: getAvatarColor(participant.name) }}
              title={participant.name}
            >
              {participant.name.charAt(0).toUpperCase()}
              {participant._id === currentUserId && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
              )}
            </div>
          ))}
          {participants.length > 5 && (
            <div className="w-8 h-8 rounded-full border-2 border-gray-700 bg-gray-600 flex items-center justify-center text-xs font-bold text-white">
              +{participants.length - 5}
            </div>
          )}
        </div>
        <span className="text-sm text-gray-400">
          {participants.length} participant{participants.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && participants.length > 0 && (
        <Card className="absolute top-full right-0 mt-2 z-50 bg-gray-800 border-gray-700 min-w-[200px]">
          <CardContent className="p-3">
            <h4 className="text-green-400 text-sm font-medium mb-2">Active Participants</h4>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div key={participant._id} className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: getAvatarColor(participant.name) }}
                  >
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-300">
                    {participant.name}
                    {participant._id === currentUserId && (
                      <span className="text-green-400 ml-1">(You)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}