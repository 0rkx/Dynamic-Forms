# Import the OpenAI library and set the API key
import openai
import config
openai.api_key = config.api_key

# Define a function to generate a prompt based on the user's response using ChatGPT
def generate_prompt(user_response):
    # Start the prompt with a basic question and include the user's response
    prompt = f"How was the product? User response: {user_response} \n"
    # Use the OpenAI API to generate a completion based on the prompt
    completions = openai.Completion.create(
        engine="text-davinci-003",
        prompt=prompt,
        max_tokens=60,
        n=1,
        stop=None,
        temperature=0.5,
    )
    # Extract the generated text from the completion and return it
    message = completions.choices[0].text.strip()+"\n"
    return message

# Define a function to get user input (i.e., their initial product review)
def get_user_input():
    user_response = input("How was the product? \n")
    return user_response

# Define the main function
def main():
    # Get the user's initial review
    user_response = get_user_input()
    # Generate a prompt based on the user's response and display it to the user
    prompt = generate_prompt(user_response)
    # Continuously ask the user questions based on their responses
    while True:
        # Get the user's response to the prompt and exit if they type "exit"
        user_response = input(prompt)
        if user_response.strip().lower() == "exit":
            break
        # Generate a new prompt based on the user's response and display it
        prompt = generate_prompt(user_response)

# Run the main function if this script is being executed directly
if __name__ == "__main__":
    main()