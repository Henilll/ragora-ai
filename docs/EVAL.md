# Ragora eval set - run this before claiming an AI improvement

Upload docs/ragora-eval-sample.txt as a document, then ask the 20 questions
below in the widget, in order. Record grounded / fallback / wrong for each.
Do not publish a score you did not run.

Sample facts (in the sample doc): Ragora was founded in 2024, supports PDF
and TXT uploads, max file size is 20 MB, support email is support@ragora.example,
and the free plan allows 1 widget. There is no pricing, no mobile app, and
no API for external developers in the sample doc.

Answerable (should cite a source, not invent):
1. When was Ragora founded?
2. What file types can I upload?
3. What is the max file size?
4. What is the support email?
5. How many widgets does the free plan allow?
6. Summarise what Ragora does in two sentences.
7. Can I upload a PDF?
8. Can I upload a TXT file?
9. Who do I contact for support?
10. What happens if my file is larger than 20 MB?

Unanswerable (should use the fallback, not invent):
11. How much does the Pro plan cost?
12. Is there a mobile app?
13. Does Ragora have an API for developers?
14. What is the refund policy?
15. Who is the CEO?

Follow-ups (should use widget memory, in order, after Q1):
16. Ask Q1, then ask "Tell me more about that." - should stay on founding, not drift.
17. Ask Q7, then ask "What about TXT?" - should answer from memory + documents.
18. Ask Q3, then ask "What if it is bigger?" - should refer to the size limit.
19. Ask Q2, then ask "And the second one?" - should name the second file type.
20. Ask Q5, then ask "Can I have more?" - should say the doc does not say, or ask about plans, not invent a price.

Metrics to record: grounded rate (answer cites a retrieved source and the
source supports it), fallback rate on Q11-Q15 (should be 5/5), follow-up
success on Q16-Q20, latency p50/p95 from backend logs, and any hallucination
(manual review, not automatic).
