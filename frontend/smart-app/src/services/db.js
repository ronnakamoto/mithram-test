import Dexie from 'dexie';

class ChatDatabase extends Dexie {
    constructor() {
        super('MithramChat');
        this.version(1).stores({
            messages: '++id, patientId, analysisId, role, content, timestamp',
            chatSessions: 'id, patientId, analysisId, lastUpdated'
        });

        // Add indices
        this.messages = this.table('messages');
        this.chatSessions = this.table('chatSessions');
    }

    async saveMessage(patientId, analysisId, message) {
        await this.messages.add({
            patientId,
            analysisId,
            ...message,
            timestamp: new Date(message.timestamp)
        });

        // Update chat session
        await this.chatSessions.put({
            id: `${patientId}-${analysisId}`,
            patientId,
            analysisId,
            lastUpdated: new Date()
        });
    }

    async getMessages(patientId, analysisId) {
        return await this.messages
            .where({ patientId, analysisId })
            .sortBy('timestamp');
    }

    async clearChat(patientId, analysisId) {
        await this.messages
            .where({ patientId, analysisId })
            .delete();
        
        await this.chatSessions
            .where({ patientId, analysisId })
            .delete();
    }

    async getChatSessions() {
        return await this.chatSessions
            .orderBy('lastUpdated')
            .reverse()
            .toArray();
    }
}

export const db = new ChatDatabase();
