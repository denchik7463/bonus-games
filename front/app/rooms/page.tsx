"use client";

import { useQuery } from "@tanstack/react-query";
import { AppFrame } from "@/components/layout/app-nav";
import { RoomCard } from "@/components/domain/room-card";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { ButtonLink } from "@/components/ui/button";
import { roomApiService } from "@/src/features/rooms/model/service";
import { getUserFriendlyError } from "@/src/shared/api/errors";
import { roomQueryKeys } from "@/src/features/rooms/model/query-keys";

export default function RoomsPage() {
  const { data: activeRooms = [], isLoading, error } = useQuery({
    queryKey: roomQueryKeys.waiting,
    queryFn: roomApiService.getWaitingRooms,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000
  });

  return (
    <AppFrame>
      <SectionHeader eyebrow="Сейчас в игре" title="Активные комнаты" description="Здесь отображаются комнаты, которые уже созданы и доступны для входа. Для быстрого старта используйте подбор или шаблоны в лобби." />
      {isLoading ? (
        <Panel>Загружаем комнаты...</Panel>
      ) : error ? (
        <Panel>
          <h2 className="text-xl font-semibold text-platinum">Не удалось загрузить комнаты</h2>
          <p className="mt-2 text-sm text-muted">{getUserFriendlyError(error)}</p>
        </Panel>
      ) : activeRooms.length ? (
        <div className="grid gap-5 lg:grid-cols-2">{activeRooms.map((room) => <RoomCard key={room.id} room={room} />)}</div>
      ) : (
        <Panel>
          <h2 className="text-xl font-semibold text-platinum">Активных комнат пока нет</h2>
          <p className="mt-2 text-sm text-muted">Запустите игру через подбор или выберите готовый шаблон.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/matchmaking">Подбор</ButtonLink>
            <ButtonLink href="/lobby" variant="secondary">Шаблоны в лобби</ButtonLink>
          </div>
        </Panel>
      )}
    </AppFrame>
  );
}
