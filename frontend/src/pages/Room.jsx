import React from 'react';
import { useParams } from 'react-router-dom';
import CollaborativeEditor from '../components/CollaborativeEditor';

const Room = () => {
    const { roomId } = useParams();

    return (
        <div className="room-page">
            <CollaborativeEditor initialRoomId={roomId} />
        </div>
    );
};

export default Room;