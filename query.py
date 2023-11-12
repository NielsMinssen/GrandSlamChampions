import pandas as pd

# Assuming you have read your CSV data into a DataFrame called `df`
df = pd.read_csv('Mens_Tennis_Grand_Slam_Winner.csv')

# Group by 'WINNER' and then aggregate the results
aggregated_data = df.groupby(['WINNER','TOURNAMENT']).agg({
    'YEAR': list,  # Collect all the years they won
    'WINNER_NATIONALITY': 'first',  # Assuming nationality does not change
    'WINNER_LEFT_OR_RIGHT_HANDED': 'first',  # Assuming handedness does not change
    'WINNER': 'size'  # Count the number of wins
}).rename(columns={'WINNER': 'NBWINS', 'YEAR': 'YEARS_WON'})

# Reset index to flatten the DataFrame from multiindex
aggregated_data.reset_index(inplace=True)

print(aggregated_data)

aggregated_data.to_csv('winner_by_tournaments.csv')