import itertools
from heapq import heappush, heappop, heapify

class Heap:
	def __init__(self):
		self.pq = []                         # list of entries arranged in a heap

	def pop(self):
		return heappop(self.pq)

	def decrease_key(self, node, new_value):
		for idx, _ in enumerate(self.pq):
			if node.state.equals(self.pq[idx][1].state):
				self.pq[idx] = (new_value, node)
				heapify(self.pq)
				return
		raise ValueError("element not found")

	def add(self, item, priority=0):
		return heappush(self.pq, (priority, item))
