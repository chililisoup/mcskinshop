export default abstract class Codec<TType, SSerialized> {
  abstract serialize(instance: TType): Promise<SSerialized>;

  abstract deserialize(data: SSerialized): Promise<TType>;

  static of = <TType, SSerialized>(
    serializer: (instance: TType) => Promise<SSerialized>,
    deserializer: (data: SSerialized) => Promise<TType>
  ): Codec<TType, SSerialized> => {
    return {
      serialize: async (instance: TType) => await serializer(instance),
      deserialize: async (data: SSerialized) => await deserializer(data)
    };
  };
}

export abstract class PairCodec<KKey, TType, SSerialized> {
  abstract key: KKey;

  abstract serialize(instance: TType): Promise<[KKey, SSerialized]>;

  abstract deserialize(data: SSerialized): Promise<TType>;

  static of = <KKey extends string, TType, SSerialized>(
    key: KKey,
    codec: Codec<TType, SSerialized>
  ): PairCodec<NoInfer<KKey>, TType, SSerialized> => {
    return {
      key: key,
      serialize: async (instance: TType) => [key, await codec.serialize(instance)],
      deserialize: data => codec.deserialize(data)
    };
  };
}
