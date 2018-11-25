import json
import ast
from collections import defaultdict


def seperate_countries(current_player, countries_state):
    match_owner_countries_id = defaultdict(list)
    dict_id_troop = {}
    for country_id in countries_state:
        match_owner_countries_id[countries_state[country_id]['owner']].append(country_id)
        dict_id_troop[country_id] = countries_state[country_id]['soldiers']
    return dict(match_owner_countries_id), dict_id_troop

def get_oppent_neighbours(match, adj_list):
    opponent_adj_list=defaultdict(list)
    for target_country_id in adj_list:
        for neighbour_id in adj_list[target_country_id]:
            for owner in match:
                target_in = target_country_id in match[owner]
                neighbour_in = neighbour_id in match[owner]
                if (target_in and not neighbour_in ) or (not target_in and  neighbour_in ):
                    opponent_adj_list[target_country_id].append(neighbour_id)
    for target_country_id in opponent_adj_list:
        opponent_adj_list[target_country_id]=list(set(opponent_adj_list[target_country_id]))
    return dict(opponent_adj_list)                         

def handle_game_state (state):
    data=ast.literal_eval(state)
    current_player = data['ctx']['currentPlayer']
    countries_state = data['G']['countries']
    adj_list=data['adjacencyList']
    agent=data['agent']
    unassigned_units = data['G']['unassignedUnits']
    
    match_countries,dict_id_troop = seperate_countries (current_player, countries_state)
    opponent_adj_list = get_oppent_neighbours(match_countries,adj_list)
    return current_player,match_countries , dict_id_troop ,opponent_adj_list,agent, unassigned_units

def select_agent(state):
    agent_tech = {'greedy': greedy_agent, 'passive': passive_agent, 'pacifist': pacifist_agent, 
                  'aggressive': aggressive_agent}
    current_player,match_owner_countries,dict_id_troop,adj_list,agent, unassigned_units = handle_game_state (state)
    args=(current_player,match_owner_countries,dict_id_troop,adj_list)
    target_list = agent_tech.get(agent)(args, unassigned_units)
    return target_list
    # print(ai_reinforce(args,unassigned_units))
    # print(target_list)

def greedy_agent(args, unassigned_units):
    #moves=ai_reinforce(args,unassigned_units)
    bsr,nbsr=heuristic(args)
    return threshold(bsr,nbsr)

def reinforce_min_country(match_owner_countries, current_player, dict_id_troop, unassigned_units):
    min_index = 0
    min_val = 999
    for country in match_owner_countries[current_player]:
        if min_val > dict_id_troop[country]:
            min_val = dict_id_troop[country]
            min_index = country
    # dict_id_troop[min_index] += unassigned_units
    return min_index

def passive_agent(args, unassigned_units):
    current_player, match_owner_countries, dict_id_troop, adj_list = args
    reinforced_source = reinforce_min_country(match_owner_countries, current_player, dict_id_troop, unassigned_units)
    return return_format([("reinforce", reinforced_source, 0, unassigned_units)])

def pacifist_agent(args, unassigned_units):
    current_player, match_owner_countries, dict_id_troop, adj_list = args
    reinforced_source = reinforce_min_country(match_owner_countries, current_player, dict_id_troop, unassigned_units)
    destination = 0
    min_val = 999
    for player in match_owner_countries:
        if player != current_player:
            for country in match_owner_countries[player]:
                if min_val > dict_id_troop[country]:
                    min_val = dict_id_troop[country]
                    destination = country
    source = 0
    max_val = -1
    for country in adj_list[destination]:
        if max_val < dict_id_troop[country]:
            max_val = dict_id_troop[country]
            source = country

    return return_format([("reinforce", reinforced_source, 0, unassigned_units), ("attack", source, destination, 0)])

def return_format(move_list):
    response = defaultdict(list)
    for tup in move_list:
        response['moves'].append({'name': tup[0], 'sourceId': tup[1], 'destId': tup[2], 'numSoldiers': tup[3]})
    return json.dumps(response)

def threshold(bsr,nbsr) :
    target_attack=[]
    for key in nbsr:
        if nbsr[key] >= 1/3:
            target_attack.append(key)
    return target_attack

def aggressive_agent(args, unassigned_units):
    current_player, match_owner_countries, dict_id_troop, adj_list = args
    reinforce_source = 0
    max_troops = -1
    for country in match_owner_countries[current_player]:
        if max_troops < dict_id_troop[country]:
            max_troops = dict_id_troop[country]
            reinforce_source = country
    
    max_val = -1
    dest = 0
    for country in adj_list[reinforce_source]:
        if max_val < dict_id_troop[country] and dict_id_troop[country] < max_troops:
            max_val = dict_id_troop[country]
            dest = country
    return return_format([("reinforce", reinforce_source, 0, unassigned_units), ("attack", reinforce_source, dest, 0)])

def heuristic(args):
    current_player,match_owner_countries,dict_id_toop,adj_list= args
    search_countries=match_owner_countries[current_player]
    opponent_BSR={}
    for country in search_countries:  
        try:
            opponents=adj_list[country]
        except:
            continue
        for opponent in opponents:
            if opponent not in opponent_BSR:
                opponent_BSR[opponent] = BSR(opponent,adj_list[opponent],dict_id_toop)
    opponent_NBSR=NBSR(opponent_BSR)
    return opponent_BSR,opponent_NBSR          

def BSR(country_id,opponent,dict_id_troop):
    sum = 0
    for opponent_id in opponent:
        sum += dict_id_troop[opponent_id]
    return sum/dict_id_troop[country_id]

def NBSR(dict_BSR):
    sum =0
    for val in dict_BSR :
        sum += dict_BSR[val]
    dict_NBSR={}
    for val in dict_BSR :
        dict_NBSR[val]=dict_BSR[val]/sum
    return dict_NBSR

def ai_reinforce(args,unsign):
    current_player, match_owner_countries,dict_id_toop,adj_list= args
    search_countries = match_owner_countries[current_player]
    country_bsr = {}
    for country in search_countries:
        try:
            country_bsr[country] = BSR(country, adj_list[country], dict_id_toop)
        except:
            continue
    max_bsr = -1
    max_id = 0
    for id_ in country_bsr:
        if max_bsr < country_bsr[id_]:
            max_bsr = country_bsr[id_]
            max_id = id_
    dict_id_toop[max_id] += unsign
    #return [("reinforce", reinforce_source, 0, unassigned_units), ("attack", reinforce_source, dest, 0)]