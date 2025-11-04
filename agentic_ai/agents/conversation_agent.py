"""
Conversation Agent
==================

Handles natural language conversations with users, answers questions about pets,
and provides contextual assistance using RAG and conversational AI.
"""

from typing import Dict, Any, List
from .base_agent import BaseAgent, AgentState
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import HumanMessage, SystemMessage, AIMessage
from langchain.memory import ConversationBufferMemory


class ConversationAgent(BaseAgent):
    """
    Agent responsible for conversational interactions.

    Capabilities:
    - Answer pet-related questions
    - Provide adoption guidance
    - Maintain conversation context
    - Integrate with RAG system
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(
            name="Conversationalist",
            description="Handles natural language conversations with users",
            config=config
        )

        self.llm = ChatOpenAI(
            model=config.get("model", "gpt-4o-mini"),
            temperature=config.get("temperature", 0.7),
            api_key=config.get("openai_api_key")
        )

        # Initialize conversation memory
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )

        self.conversation_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a friendly and knowledgeable pet adoption assistant.
            Help users find their perfect pet companion by answering questions,
            providing advice, and guiding them through the adoption process.
            Be warm, encouraging, and informative.

            Context: {context}
            """),
            ("human", "{input}")
        ])

    async def process(self, state: AgentState) -> AgentState:
        """
        Process user conversation input.

        Args:
            state: Current agent state with conversation data

        Returns:
            Updated state with response
        """
        try:
            user_message = state.data.get("message", "")
            context = state.data.get("context", {})

            if not user_message:
                state.add_error("No message provided")
                return state

            # Generate response
            response = await self._generate_response(user_message, context)

            # Update conversation history
            self._update_memory(user_message, response)

            # Update state
            state.update_data("response", response)
            state.update_data("conversation_history", self._get_history())

            state.update_metadata("conversation_agent_version", "1.0.0")
            state.update_metadata("response_generated", True)

            self.logger.info(f"Generated response for user message")

            return state

        except Exception as e:
            self.logger.error(f"Conversation processing failed: {str(e)}")
            state.add_error(f"Conversation error: {str(e)}")
            return state

    async def _generate_response(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> str:
        """
        Generate conversational response.

        Args:
            user_message: User's message
            context: Additional context (recommendations, pet data, etc.)

        Returns:
            AI-generated response
        """
        # Format context
        context_str = self._format_context(context)

        # Format prompt
        messages = self.conversation_prompt.format_messages(
            context=context_str,
            input=user_message
        )

        # Get response
        response = await self.llm.apredict_messages(messages)

        return response.content

    def _format_context(self, context: Dict[str, Any]) -> str:
        """
        Format context for the conversation.

        Args:
            context: Context dictionary

        Returns:
            Formatted context string
        """
        context_parts = []

        # Add user profile info
        if "user_profile" in context:
            profile = context["user_profile"]
            preferences = profile.get("preferences", {})
            context_parts.append(
                f"User prefers: {', '.join(preferences.get('pet_types', []))}"
            )

        # Add recommendations
        if "recommendations" in context:
            recs = context["recommendations"][:3]
            pet_names = [r.get("pet_name", "Unknown") for r in recs]
            context_parts.append(
                f"Current recommendations: {', '.join(pet_names)}"
            )

        # Add pet info if discussing specific pet
        if "current_pet" in context:
            pet = context["current_pet"]
            context_parts.append(
                f"Discussing: {pet.get('name')} - {pet.get('type')}"
            )

        return "\n".join(context_parts) if context_parts else "No specific context"

    def _update_memory(self, user_message: str, response: str) -> None:
        """
        Update conversation memory.

        Args:
            user_message: User's message
            response: AI's response
        """
        self.memory.chat_memory.add_user_message(user_message)
        self.memory.chat_memory.add_ai_message(response)

    def _get_history(self) -> List[Dict[str, str]]:
        """
        Get conversation history.

        Returns:
            List of conversation messages
        """
        history = []
        for message in self.memory.chat_memory.messages:
            if isinstance(message, HumanMessage):
                history.append({"role": "user", "content": message.content})
            elif isinstance(message, AIMessage):
                history.append({"role": "assistant", "content": message.content})
        return history

    async def answer_question(
        self,
        question: str,
        pet_data: Dict[str, Any] = None
    ) -> str:
        """
        Answer a specific question about a pet or adoption.

        Args:
            question: User's question
            pet_data: Optional pet data for context

        Returns:
            Answer string
        """
        context = {"current_pet": pet_data} if pet_data else {}

        state = AgentState(
            agent_name=self.name,
            timestamp=None,
            data={"message": question, "context": context},
            metadata={},
            errors=[]
        )

        result = await self.process(state)
        return result.data.get("response", "I'm not sure how to answer that.")
