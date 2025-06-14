import React from 'react';
import { useSelector } from 'react-redux';

const CollaboratorPresence = () => {
  const collaborators = useSelector(state => state.canvas.collaborators);

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-[#181818]/95 rounded-lg shadow-lg p-3 space-y-2 backdrop-blur-sm border border-gray-800/50">
        <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Collaborators ({collaborators.length})
        </h3>
        {collaborators.map((collaborator) => {
          const isActive = collaborator.position && Date.now() - (collaborator.lastUpdate || 0) < 2000;
          
          return (
            <div
              key={collaborator.id}
              className="flex items-center justify-between space-x-2 p-1 rounded-md hover:bg-gray-100"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: collaborator.color,
                    boxShadow: isActive ? `0 0 0 2px ${collaborator.color}40` : 'none'
                  }}
                />
                <span className="text-sm text-gray-100">
                  {collaborator.name}
                </span>
              </div>
              {collaborator.tool && (
                <span className="text-xs text-gray-400">
                  {collaborator.tool}
                </span>
              )}
            </div>
          );
        })}
        {collaborators.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-2">
            No collaborators
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaboratorPresence;
