import React, { useState, useEffect } from 'react';
import { fetchConversations, fetchConversationMessages, createConversation, deleteConversation, sendMessage } from '../Api';
import { formatDate } from '../components/Date';
import userAvatar from '../assets/Avatar.png';
import Header from '../components/Header';
import'../index.css';
import Swal from 'sweetalert2'; 

// CSS styles for the circular spinner
const spinnerStyle = {
  width: '50px',
  height: '50px',
  borderRadius: '50%',
  border: '8px solid #ccc',
  borderTopColor: 'purple',
  animation: 'spin 1s linear infinite',
};

const Dashboard = () => {
  const [showLeftSection, setShowLeftSection] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversationState] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false); // State for conversation loading
  const [loadingChat, setLoadingChat] = useState(false); // State for chat loading
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    const getConversations = async () => {
      setLoadingConversations(true);
      try {
        const response = await fetchConversations();
        setConversations(response.data);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoadingConversations(false);
      }
    };

    getConversations();

    const updateDateTime = () => {
      const date = new Date();
      setCurrentDateTime(formatDate(date));
    };

    
    updateDateTime();

    // Update the date and time every minute
    const intervalId = setInterval(updateDateTime, 60000);

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const toggleSection = () => {
    setShowLeftSection(!showLeftSection);
  };

  const addConversation = async () => {
    try {
      const response = await createConversation();
      const newConversation = response.data;
      setConversations([...conversations, newConversation]);
      setCurrentConversationState(newConversation);
      setShowLeftSection(false); // Close the left section on small screens
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const setCurrentConversation = async (conversation) => {
    setLoadingChat(true); // Start chat loading spinner
    try {
      const response = await fetchConversationMessages(conversation.id);
      setCurrentConversationState({ ...conversation, messages: response.data });
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
    } finally {
      setLoadingChat(false); // Stop chat loading spinner
    }
    setShowLeftSection(false); // Close the left section when a conversation is selected
  };

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const handleInputKeyPress = async (e) => {
    if (e.key === 'Enter' && userInput.trim() !== '') {
      if (currentConversation) {
        const updatedConversation = {
          ...currentConversation,
          messages: [...currentConversation.messages, { text: userInput, type: 'user' }],
        };
        setCurrentConversationState(updatedConversation);
        setUserInput('');

        try {
          const response = await sendMessage(currentConversation.id, userInput);
          const botResponse = response.data;
          setCurrentConversationState({
            ...updatedConversation,
            messages: [...updatedConversation.messages, ...botResponse.map(msg => ({ text: msg.content, type: 'bot' }))]
          });
        } catch (error) {
          console.error('Error sending message:', error);
        }
      }
    }
  };

  const confirmDelete = async (id) => {
      try {
        const conversationToDelete = conversations.find(convo => convo.id === id);
        if (!conversationToDelete) {
          console.error('Conversation not found.');
          return;
        }
      const result = await Swal.fire({
        title: `Are you sure you want to delete conversation ${conversationToDelete.id + 1}?`,
        showCancelButton: true,
        confirmButtonColor: '#FF0000',
        cancelButtonColor: '#DDF3FF',
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        reverseButtons: true,
        customClass: {
          title: 'custom-swal-title', 
        popup: 'bg-custom-purple', // Add a custom class for styling
      },
      });

      if (result.isConfirmed) {
        await deleteConversation(id);
        setConversations(conversations.filter(convo => convo.id !== id));
        if (currentConversation && currentConversation.id === id) {
          setCurrentConversationState(null);
        }
        Swal.fire('Deleted!', 'Your conversation has been deleted.', 'success');
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire('Cancelled', 'Your conversation is safe :)', 'error');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex flex-grow h-full">
        <div className={`flex-shrink-0 p-4 ${showLeftSection ? 'block' : 'hidden'} lg:block w-full lg:w-2/5`} style={{ minHeight: 'calc(100vh - 72px)' }}>
          <div className="flex items-center justify-between bg-custom-blue text-white p-2 mb-4">
            <span className='font-manrope text-base font-normal leading-5 text-left'>Conversation</span>
            <span className="cursor-pointer w-6 h-6" onClick={addConversation}>+</span>
            <img
            src="/images/menu-toggle.png"
            alt="Toggle"
            className="lg:hidden cursor-pointer"
            onClick={toggleSection}
          />
        </div>
        {loadingConversations ? (
          <div className="bg-light-gray h-full lg:w-full w-4/5 conversation-history flex items-center justify-center">
            <div style={spinnerStyle}></div>
            Loading Conversations...
          </div>
        ) : (
          <div className="bg-light-gray h-full lg:w-full w-4/5 conversation-history">
            {conversations.map(convo => (
              <div
                key={convo.id}
                className={`p-2 mb-2 border rounded flex justify-between items-center cursor-pointer ${currentConversation && currentConversation.id === convo.id ? 'bg-custom-purple text-white' : 'bg-light-gray text-black'}`}
                onClick={() => setCurrentConversation(convo)}
              >
                <span>Conversation {convo.id + 1}</span>
                <button
                  className="p-1 ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete(convo.id); // Change to confirmDelete
                  }}
                >
                  <img
                    src="/images/delete.png"
                    alt="Delete Conversation"
                    className="w-4 h-4"
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={`flex-grow p-4 ${showLeftSection ? 'hidden' : 'block'}`} style={{ minHeight: 'calc(100vh -72px)' }}>
        <div className="flex items-center justify-between bg-custom-blue text-white p-2 mb-4">
          <div className="flex items-center">
            <img src="/images/profile image.png" alt="profile" className="h-8 w-8 rounded-full mr-2" />
            <span>Chatbot</span>
          </div>
          <img
            src="/images/menu-toggle.png"
            alt="Toggle Icon"
            className="lg:hidden cursor-pointer"
            onClick={toggleSection}
          />
        </div>
        <div className="flex flex-col h-full">
        {currentConversation ? (
          <>
            <div className="text-center text-gray-500 mb-2">{currentDateTime}</div>
            <div className="flex-grow bg-gray-100 p-4 overflow-y-auto">
              {loadingChat ? (
                <div className="flex items-center justify-center">
                  <div style={spinnerStyle}></div>
                  Loading Messages...
                </div>
              ) : (
                currentConversation.messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.type === 'bot' && (
                      <img src="/images/profile image.png" alt="Chatbot" className="h-8 w-8 rounded-full mr-2" />
                    )}
                    {msg.type === 'user' && (
                      <div className="flex items-center">
                      <div className={`p-2 rounded ${msg.type === 'user' ? 'bg-custom-purple text-white' : 'bg-gray-200 text-black'}`}>
                          {msg.text}
                        </div>
                        <img src={userAvatar} alt="User Avatar" className="h-8 w-8 rounded-full mr-2" />
                        
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-grow bg-gray-100 p-4 overflow-y-auto"></div>
        )}
          <div className="flex items-center bg-white p-2 border-t">
            <input
              type="text"
              placeholder="Reply to Chatbot"
              value={userInput}
              onChange={handleInputChange}
              onKeyPress={handleInputKeyPress}
              className="flex-grow p-2 border rounded"
            />
            <button className="bg-custom-purple rounded-full p-2 ml-2">
              <img
                src="/images/send.png"
                alt="Logo"
                className="w-8 h-8 rounded-full"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default Dashboard;

