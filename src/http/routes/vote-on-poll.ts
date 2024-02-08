import z from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { FastifyInstance } from "fastify";

export async function voteOnPoll(app: FastifyInstance) {
    app.post('/polls/:pollId/votes', async (request, response) => {
        const voteOnPollBody = z.object({
            pollOptionId: z.string().uuid(),
        });

        const voteOnPollParams = z.object({
            pollId: z.string().uuid()
        })

        const { pollOptionId } = voteOnPollBody.parse(request.body);
        const { pollId } = voteOnPollParams.parse(request.params);

        let { sessionId } = request.cookies;

        if (sessionId) {
            const userPreviousVoteOnPoll = await prisma.vote.findUnique({
                where: {
                    sessionId_pollId: { // search by the index sessionId_pollId
                        sessionId,
                        pollId
                    },
                }
            });
            
            // if vote is different
            if (userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionId !== pollOptionId) {
                // delete previous vote
                await prisma.vote.delete({
                    where: {
                        id: userPreviousVoteOnPoll.id
                    }
                });
            } else if (userPreviousVoteOnPoll) {
                return response.status(400).send({ message: 'You already vote on this poll' });
            }
        }

        if (!sessionId) {
            sessionId = randomUUID();

            response.setCookie('sessionId', sessionId, {
                path: '/',
                maxAge: 60 * 60 * 24 * 30, // 30 days
                signed: true,
                httpOnly: true // front-end não consegue acessar esse cookie | só o back consegue
            });
        }

        await prisma.vote.create({
            data: {
                sessionId,
                pollId,
                pollOptionId
            }
        });

        return response.status(201).send();
    });

}